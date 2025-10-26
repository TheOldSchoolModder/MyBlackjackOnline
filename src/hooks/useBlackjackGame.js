
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useSound } from '@/hooks/useSound';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const MIN_BET = 10;

// Function to create a standard 52-card deck
const createDeck = () => {
  return SUITS.flatMap(suit =>
    VALUES.map(value => ({ value, suit, id: `${value}-${suit}-${Math.random()}` }))
  );
};

// Function to shuffle the deck
const shuffleDeck = deck => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Function to get the numerical value of a card
const getCardValue = (card) => {
  if (!card) return 0;
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value, 10);
};

// Function to calculate the score of a hand
const calculateScore = (hand) => {
  if (!hand || hand.length === 0) return 0;
  let score = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  let aces = hand.filter(card => card.value === 'A').length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
};


export const useBlackjackGame = (gameMode, roomCode, player, initialBalance, playSound, updatePlayerBalanceInContext) => {
    const [players, setPlayers] = useState({});
    const [dealerHand, setDealerHand] = useState({ cards: [], score: 0 });
    const [gameStatus, setGameStatus] = useState('loading');
    const [activePlayerId, setActivePlayerId] = useState(null);
    const [activeHandIndex, setActiveHandIndex] = useState(0);
    const [balance, setBalance] = useState(initialBalance);
    const [roundResult, setRoundResult] = useState(null);
    const [gameLog, setGameLog] = useState([]);
    const [roundCounter, setRoundCounter] = useState(0);
    const [keepSideBets, setKeepSideBets] = useState(false);
    const [keepMainBet, setKeepMainBet] = useState(false);
    const [deck, setDeck] = useState([]);
    
    const isHost = player && players[player.id]?.isHost;
    const myPlayerState = player ? players[player.id] : null;

    const gameChannelRef = useRef(null);
    const roundEndTimeoutRef = useRef(null);
    const dealerTurnInProgress = useRef(false);
    const dealInProgress = useRef(false);

    const logEvent = useCallback((message, details = {}) => {
        setGameLog(prev => [{ timestamp: new Date(), message, details }, ...prev].slice(0, 50));
    }, []);

    const updateGameStateOnServer = useCallback(async (newState) => {
        if (gameMode !== 'friend') return;
        try {
          const { error } = await supabase
              .from('game_rooms')
              .update({ game_state: newState })
              .eq('room_code', roomCode);
          if (error) throw error;
        } catch(e) {
          console.error("Error updating game state:", e);
        }
    }, [gameMode, roomCode]);

    const setAndPersistState = useCallback((newState) => {
        setPlayers(newState.players || {});
        setDealerHand(newState.dealer || { cards: [], score: 0 });
        setGameStatus(newState.status || 'betting');
        setActivePlayerId(newState.activePlayerId || null);
        setActiveHandIndex(newState.activeHandIndex || 0);
        setRoundCounter(newState.roundCounter || 1);
        setDeck(newState.deck || []);
        
        if (gameMode === 'friend') {
            updateGameStateOnServer(newState);
        }
    }, [gameMode, updateGameStateOnServer]);
    
    const resetForNewRound = useCallback((currentState) => {
        const nextRoundPlayers = { ...currentState.players };
        let prevBets = {};

        for (const pid in nextRoundPlayers) {
            const p = nextRoundPlayers[pid];
            prevBets[pid] = { main: p.hands?.[0]?.bet, sides: p.sideBets };
            p.hands = [{ cards: [], score: 0, bet: 0, status: 'betting' }];
            p.sideBets = { perfectPairs: 0, twentyOnePlusThree: 0, luckyLadies: 0, royalMatch: 0, busterBlackjack: 0 };
            p.result = null;
            p.hasPlacedBet = false;
        }

        const newState = {
            ...currentState,
            players: nextRoundPlayers,
            dealer: { cards: [], score: 0 },
            status: 'betting',
            activePlayerId: null,
            activeHandIndex: 0,
            roundCounter: (currentState.roundCounter || 0) + 1,
            deck: [],
        };
        
        setAndPersistState(newState);
        setRoundResult(null);
        logEvent('New round started', { round: newState.roundCounter });
    }, [setAndPersistState, logEvent]);

    const handleDeal = useCallback((force = false) => {
        if (gameStatus !== 'betting' || dealInProgress.current) return;
    
        const activePlayers = Object.values(players).filter(p => !p.isSpectating);
        const allBetsPlaced = activePlayers.length > 0 && activePlayers.every(p => p.hasPlacedBet);
        
        if (!allBetsPlaced && !force) return;
    
        dealInProgress.current = true;
        let newDeck = shuffleDeck(createDeck());
        playSound('shuffle');
    
        const dealState = {
            players: JSON.parse(JSON.stringify(players)),
            dealer: { cards: [], score: 0 },
            status: 'dealing',
            activePlayerId: null,
            activeHandIndex: 0,
            roundCounter,
            deck,
        };
    
        const playerIds = Object.keys(dealState.players).filter(p => !dealState.players[p].isSpectating);
        
        playerIds.forEach(pid => {
            const playerToReset = dealState.players[pid];
            const existingBet = playerToReset.hands?.[0]?.bet || 0;
            playerToReset.hands = [{ cards: [], score: 0, bet: existingBet, status: 'playing' }];
        });
    
        const dealQueue = [];
        playerIds.forEach(pid => dealQueue.push({ type: 'player', pid }));
        dealQueue.push({ type: 'dealer' });
        playerIds.forEach(pid => dealQueue.push({ type: 'player', pid }));
        dealQueue.push({ type: 'dealer' });
    
        const processDealQueue = (index) => {
            if (index >= dealQueue.length) {
                const finalPlayers = { ...dealState.players };
                for (const pid in finalPlayers) {
                    if (!finalPlayers[pid].isSpectating) {
                        finalPlayers[pid].hands.forEach(hand => {
                            hand.score = calculateScore(hand.cards);
                        });
                    }
                }
                const finalDealerHand = { ...dealState.dealer, score: calculateScore(dealState.dealer.cards) };
    
                const nextPlayerId = playerIds.find(pid => {
                    const p = finalPlayers[pid];
                    const handScore = p.hands?.[0] ? calculateScore(p.hands[0].cards) : 0;
                    return !p.isSpectating && handScore < 21;
                });
    
                const finalState = {
                    ...dealState,
                    players: finalPlayers,
                    dealer: finalDealerHand,
                    status: nextPlayerId ? 'playing' : 'dealer',
                    activePlayerId: nextPlayerId,
                    deck: newDeck
                };
                setAndPersistState(finalState);
                logEvent("Round started. Cards dealt.");
                dealInProgress.current = false;
                return;
            }
    
            const dealAction = dealQueue[index];
            const newCard = newDeck.pop();
            newCard.dealDelay = index * 0.2;
    
            if (dealAction.type === 'player') {
                dealState.players[dealAction.pid].hands[0].cards.push(newCard);
            } else {
                dealState.dealer.cards.push(newCard);
            }
    
            playSound('deal');
            setPlayers({ ...dealState.players });
            setDealerHand({ ...dealState.dealer });
    
            setTimeout(() => processDealQueue(index + 1), 200);
        };
    
        processDealQueue(0);
    
    }, [players, gameStatus, roundCounter, deck, playSound, setAndPersistState, logEvent]);
    
    const handleNextPlayer = useCallback((currentPlayerId) => {
        const currentState = { players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        const playerIds = Object.keys(currentState.players).filter(p => !currentState.players[p].isSpectating);
        const currentIndex = playerIds.indexOf(currentPlayerId);

        let nextPlayerId = null;
        for (let i = currentIndex + 1; i < playerIds.length; i++) {
            const potentialNextPlayerId = playerIds[i];
            const playerState = currentState.players[potentialNextPlayerId];
            const handScore = playerState?.hands?.[0] ? calculateScore(playerState.hands[0].cards) : 0;

            if (handScore < 21) {
                nextPlayerId = potentialNextPlayerId;
                break;
            }
        }
        
        if (nextPlayerId) {
             setAndPersistState({ ...currentState, activePlayerId: nextPlayerId, activeHandIndex: 0 });
        } else {
             // No more players to play, dealer's turn
            setAndPersistState({ ...currentState, status: 'dealer', activePlayerId: null });
        }
    }, [players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck, setAndPersistState]);

    const handleHit = useCallback(() => {
        const currentState = { players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        if (currentState.gameStatus !== 'playing' || currentState.activePlayerId !== player.id) return;
        
        const newDeck = [...currentState.deck];
        const newCard = newDeck.pop();
        newCard.dealDelay = 0.1; // Quick animation for hit
        playSound('deal');

        const newPlayers = { ...currentState.players };
        const playerState = newPlayers[player.id];
        const hand = playerState.hands[currentState.activeHandIndex];
        
        hand.cards.push(newCard);
        hand.score = calculateScore(hand.cards);

        const newState = { ...currentState, players: newPlayers, deck: newDeck };
        
        // Update state immediately for UI responsiveness
        setPlayers(newState.players);
        setDeck(newState.deck);

        if (hand.score >= 21) {
            if(hand.score > 21) playSound('lose');
            logEvent(`${player.username} ${hand.score > 21 ? 'busts' : 'has 21'} with ${hand.score}`);
            // Persist state and then move to next player
            updateGameStateOnServer(newState);
            setTimeout(() => handleNextPlayer(player.id), 1000);
        } else {
            // Just persist the state if not busted
            setAndPersistState(newState);
        }
    }, [player, players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck, playSound, setAndPersistState, logEvent, handleNextPlayer, updateGameStateOnServer]);
    
    const handleStand = useCallback(() => {
        const currentState = { players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        if (currentState.gameStatus !== 'playing' || currentState.activePlayerId !== player.id) return;
        
        logEvent(`${player.username} stands with ${myPlayerState.hands[activeHandIndex].score}`);
        handleNextPlayer(player.id);
    }, [player, myPlayerState, activeHandIndex, gameStatus, activePlayerId, logEvent, handleNextPlayer]);

    useEffect(() => {
        if (gameStatus !== 'dealer' || dealerTurnInProgress.current) return;
        dealerTurnInProgress.current = true;

        const currentState = { players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        let currentDealerHand = { ...currentState.dealer };
        let currentDeck = [...currentState.deck];
        
        const dealerPlay = () => {
            if (currentDealerHand.score < 17) {
                const newCard = currentDeck.pop();
                newCard.dealDelay = 0.1;
                currentDealerHand.cards.push(newCard);
                currentDealerHand.score = calculateScore(currentDealerHand.cards);
                
                playSound('dealerFlip');
                setDealerHand({ ...currentDealerHand });
                setDeck([...currentDeck]);
                
                setTimeout(dealerPlay, 1000);
            } else {
                logEvent(`Dealer stands with ${currentDealerHand.score}`);
                const newState = { ...currentState, dealer: currentDealerHand, deck: currentDeck, status: 'roundOver' };
                setAndPersistState(newState);
                dealerTurnInProgress.current = false;
            }
        };

        setTimeout(dealerPlay, 1000);
    }, [gameStatus, players, dealerHand, roundCounter, activePlayerId, activeHandIndex, deck, playSound, logEvent, setAndPersistState]);

    useEffect(() => {
        if (gameStatus !== 'roundOver') return;

        const currentState = { players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        const results = {};
        let totalWinningsForPlayer = 0;

        Object.values(currentState.players).forEach(p => {
            if(p.isSpectating) return;

            const hand = p.hands[0];
            const bet = hand.bet;
            let resultText = '';
            let winnings = 0;

            if (hand.score > 21) {
                resultText = 'Bust';
                winnings = -bet;
            } else if (dealerHand.score > 21 || hand.score > dealerHand.score) {
                resultText = 'Win';
                winnings = bet;
                playSound('win');
            } else if (hand.score < dealerHand.score) {
                resultText = 'Lose';
                winnings = -bet;
                playSound('lose');
            } else {
                resultText = 'Push';
                winnings = 0;
                playSound('push');
            }

            results[p.id] = { result: resultText, totalWinnings: winnings };
            if (p.id === player.id) {
                totalWinningsForPlayer += winnings;
            }
        });

        setRoundResult(results);
        if (typeof updatePlayerBalanceInContext === 'function') {
            updatePlayerBalanceInContext(totalWinningsForPlayer);
        } else {
            console.error("updatePlayerBalanceInContext is not a function. Check props.", updatePlayerBalanceInContext)
        }
        setBalance(b => b + totalWinningsForPlayer);

        logEvent('Round over.', { dealerScore: dealerHand.score, results });

        roundEndTimeoutRef.current = setTimeout(() => {
            resetForNewRound(currentState);
        }, 5000);
        
        return () => clearTimeout(roundEndTimeoutRef.current);
    }, [gameStatus, players, dealerHand, roundCounter, activePlayerId, activeHandIndex, deck, player, playSound, resetForNewRound, logEvent, updatePlayerBalanceInContext]);

    useEffect(() => {
      if (gameStatus === 'betting') {
        const activePlayers = Object.values(players).filter(p => !p.isSpectating);
        const readyPlayers = activePlayers.filter(p => p.hasPlacedBet);
        if(gameMode === 'friend' && activePlayers.length > 0 && activePlayers.length === readyPlayers.length) {
            handleDeal();
        }
      }
    }, [players, gameStatus, handleDeal, gameMode]);
    
    const handlePlaceBet = useCallback((amount, betType, sideBetName = null) => {
        if (!player || !myPlayerState || myPlayerState.isSpectating || myPlayerState.hasPlacedBet) return;
    
        const currentState = { players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        const newPlayers = { ...currentState.players };
        const playerToUpdate = { ...newPlayers[player.id] };
    
        if (!playerToUpdate.hands || playerToUpdate.hands.length === 0) {
            playerToUpdate.hands = [{ cards: [], score: 0, bet: 0, status: 'betting' }];
        }
        if (!playerToUpdate.sideBets) {
            playerToUpdate.sideBets = {};
        }

        const currentMainBet = playerToUpdate.hands[0].bet || 0;
        const currentSideBetsTotal = Object.values(playerToUpdate.sideBets).reduce((a, b) => a + b, 0);
        const currentTotalBet = currentMainBet + currentSideBetsTotal;

        if (balance >= currentTotalBet + amount) {
            if (betType === 'main') {
                playerToUpdate.hands[0].bet += amount;
            } else if (betType === 'side' && sideBetName) {
                playerToUpdate.sideBets[sideBetName] = (playerToUpdate.sideBets[sideBetName] || 0) + amount;
            }
    
            newPlayers[player.id] = playerToUpdate;
            const newState = { ...currentState, players: newPlayers };
    
            setPlayers(newPlayers);
            if (gameMode === 'friend') updateGameStateOnServer(newState);
        }
    }, [player, myPlayerState, balance, players, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck, gameMode, updateGameStateOnServer]);
    
    const handleDouble = () => { console.log("Double action"); };
    const handleSplit = () => { console.log("Split action"); };
    const handleSurrender = () => { console.log("Surrender action"); };
    const handleNewRound = () => resetForNewRound({ players, dealerHand, roundCounter, gameStatus, activePlayerId, activeHandIndex, deck });

    const handleClearBet = () => {
        if(!myPlayerState || myPlayerState.isSpectating || myPlayerState.hasPlacedBet) return;
        const newState = { players: {...players}, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        const playerToUpdate = newState.players[player.id];

        if(playerToUpdate.hands?.[0]) {
            playerToUpdate.hands[0].bet = 0;
        }
        playerToUpdate.sideBets = { perfectPairs: 0, twentyOnePlusThree: 0, luckyLadies: 0, royalMatch: 0, busterBlackjack: 0 };
        
        setPlayers(newState.players);
        if (gameMode === 'friend') updateGameStateOnServer(newState);
    };
    const handleClearSideBet = (sideBetName) => {
        if(!myPlayerState || myPlayerState.isSpectating || myPlayerState.hasPlacedBet) return;
        const newState = { players: {...players}, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        const playerToUpdate = newState.players[player.id];
        
        if(playerToUpdate.sideBets?.[sideBetName]) {
            playerToUpdate.sideBets[sideBetName] = 0;
        }

        setPlayers(newState.players);
        if (gameMode === 'friend') updateGameStateOnServer(newState);
    };

    const handleLockBet = async () => {
        if (!myPlayerState || (myPlayerState.hands?.[0]?.bet || 0) < MIN_BET || myPlayerState.hasPlacedBet) return;

        const newState = { players: {...players}, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        newState.players[player.id].hasPlacedBet = true;

        setPlayers(newState.players);
        playSound('bet');
        
        if (gameMode === 'practice') {
          handleDeal(true);
        } else {
           await updateGameStateOnServer(newState);
        }
    };

    const toggleSpectator = () => {
        if (!myPlayerState) return;
        const newState = { players: {...players}, dealerHand, gameStatus, roundCounter, activePlayerId, activeHandIndex, deck };
        const playerToUpdate = newState.players[player.id];
        playerToUpdate.isSpectating = !playerToUpdate.isSpectating;

        if(playerToUpdate.isSpectating) {
            playerToUpdate.hasPlacedBet = false;
        }
        setPlayers(newState.players);
        if (gameMode === 'friend') updateGameStateOnServer(newState);
    };

    const handleMinBet = () => {
      const currentMainBet = myPlayerState?.hands?.[0]?.bet || 0;
      const amountToAdd = MIN_BET - currentMainBet;
      if (amountToAdd > 0) {
        handlePlaceBet(amountToAdd, 'main');
      }
    };
    
    const handleMaxBet = () => {
        const currentTotalBet = (myPlayerState?.hands?.[0]?.bet || 0) + Object.values(myPlayerState?.sideBets || {}).reduce((a, b) => a + b, 0);
        const amountToAdd = balance - currentTotalBet;
        if (amountToAdd > 0) {
          handlePlaceBet(amountToAdd, 'main');
        }
    };

    const handleKeepSideBetsToggle = () => setKeepSideBets(prev => !prev);
    const handleKeepMainBetToggle = () => setKeepMainBet(prev => !prev);


    useEffect(() => {
        const fetchInitialState = async () => {
            if (gameMode !== 'friend') {
                const p = {
                    [player.id]: {
                        id: player.id,
                        username: player.username,
                        isHost: true,
                        isSpectating: false,
                        hasPlacedBet: false,
                        hands: [{ cards: [], score: 0, bet: 0, status: 'betting' }],
                        sideBets: {},
                    }
                };
                setPlayers(p);
                setGameStatus('betting');
                setRoundCounter(1);
                setDeck(shuffleDeck(createDeck()));
                return;
            }

            const { data, error } = await supabase
                .from('game_rooms')
                .select('game_state')
                .eq('room_code', roomCode)
                .single();

            if (error || !data) {
                console.error("Error fetching initial game state:", error);
                setGameStatus('error');
            } else {
                const gameState = data.game_state || { players: {}, dealer: { cards: [], score: 0 }, status: 'betting', roundCounter: 1, deck: [] };
                if (!gameState.players) gameState.players = {};

                if (!gameState.players[player.id]) {
                    gameState.players[player.id] = {
                        id: player.id,
                        username: player.username,
                        isHost: Object.keys(gameState.players).length === 0,
                        isSpectating: gameState.status !== 'betting',
                        hasPlacedBet: false,
                        hands: [{ cards: [], score: 0, bet: 0, status: 'betting' }],
                        sideBets: {},
                    };
                    await updateGameStateOnServer(gameState);
                }
                setPlayers(gameState.players || {});
                setDealerHand(gameState.dealer || { cards: [], score: 0 });
                setGameStatus(gameState.status || 'betting');
                setActivePlayerId(gameState.activePlayerId || null);
                setActiveHandIndex(gameState.activeHandIndex || 0);
                setRoundCounter(gameState.roundCounter || 1);
                setDeck(gameState.deck || []);
            }
        };

        if (player) {
            fetchInitialState();
        }
    }, [gameMode, roomCode, player, updateGameStateOnServer]);
    
    useEffect(() => {
        if (gameMode !== 'friend' || !roomCode) return;

        gameChannelRef.current = supabase.channel(`game:${roomCode}`);
        
        const subscription = gameChannelRef.current
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `room_code=eq.${roomCode}`
            }, (payload) => {
                const newState = payload.new.game_state;
                if(newState) {
                  setPlayers(newState.players || {});
                  setDealerHand(newState.dealer || { cards: [], score: 0 });
                  setGameStatus(newState.status || 'betting');
                  setActivePlayerId(newState.activePlayerId || null);
                  setActiveHandIndex(newState.activeHandIndex || 0);
                  setRoundCounter(newState.roundCounter || 1);
                  setDeck(newState.deck || []);
                }
            })
            .subscribe((status, err) => {
              if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to game room ${roomCode}`);
              }
              if (err) {
                console.error('Subscription error:', err);
              }
            });

        return () => {
            if (gameChannelRef.current) {
                supabase.removeChannel(gameChannelRef.current);
                gameChannelRef.current = null;
            }
        };
    }, [gameMode, roomCode]);
    
    const playerHands = myPlayerState?.hands?.reduce((acc, hand, index) => {
        acc[player.id] = acc[player.id] || [];
        acc[player.id][index] = hand;
        return acc;
    }, {}) || {};
    
    const allBets = Object.entries(players).reduce((acc, [pid, p]) => {
        acc[pid] = {
            main: p.hands?.reduce((sum, hand) => sum + (hand.bet || 0), 0) || 0,
            side: Object.values(p.sideBets || {}).reduce((sum, bet) => sum + bet, 0)
        };
        return acc;
    }, {});
    
    const currentBet = allBets[player?.id]?.main || 0;
    const sideBets = myPlayerState?.sideBets || {};
    
    const canHit = gameStatus === 'playing' && activePlayerId === player?.id;
    const canStand = gameStatus === 'playing' && activePlayerId === player?.id;
    const canDouble = gameStatus === 'playing' && activePlayerId === player?.id && myPlayerState?.hands?.[activeHandIndex]?.cards?.length === 2;
    const canSplit = false;
    const canSurrender = false;

    return {
        players, dealerHand, gameStatus, activePlayerId, activeHandIndex, balance,
        roundResult, gameLog, roundCounter, keepSideBets, keepMainBet, isHost,
        myPlayerState, playerHands, allBets, currentBet, sideBets,
        canHit, canStand, canDouble, canSplit, canSurrender,
        handleHit, handleStand, handleDouble, handleSplit, handleSurrender,
        handleNewRound, handlePlaceBet, handleDeal, handleClearBet, handleClearSideBet,
        handleLockBet, toggleSpectator, handleMinBet, handleMaxBet,
        handleKeepSideBetsToggle, handleKeepMainBetToggle,
        getCardValue
    };
};
