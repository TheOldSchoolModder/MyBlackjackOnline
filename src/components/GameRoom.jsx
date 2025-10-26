
import React, { useState, useEffect, useCallback, useContext, useRef, createRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, animate } from 'framer-motion';
import {
  ArrowLeft, Copy, User, ChevronRight, Volume2, HelpCircle, UserPlus, MessageSquare, X, VolumeX, Eye, Send, Loader2, Lock, Play, EyeOff, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import PlayingCard from '@/components/PlayingCard';
import GameControls from '@/components/GameControls';
import PlayerSeat from '@/components/PlayerSeat';
import RulesModal from '@/components/RulesModal';
import RoundSummary from '@/components/RoundSummary';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import GameLog from '@/components/GameLog';
import { useBlackjackGame } from '@/hooks/useBlackjackGame';
import { useSound } from '@/hooks/useSound';
import { useWindowSize } from '@/hooks/useWindowSize';
import { useTranslation } from '@/hooks/useTranslation';
import { AppContext } from '@/context/AppContext';
import { supabase } from '@/lib/customSupabaseClient';

const AnimatedBalance = ({ value }) => {
    const motionValue = useMotionValue(value);
    const springValue = useSpring(motionValue, {
      damping: 50,
      stiffness: 400,
    });
    const balanceRef = useRef(null);
  
    useEffect(() => {
        const node = balanceRef.current;
        if (!node) return;

        const controls = animate(springValue, value, {
            damping: 50,
            stiffness: 400,
        });

        return controls.stop;
    }, [value, springValue]);
  
    useEffect(() => {
      const unsubscribe = springValue.on("change", (latest) => {
        if (balanceRef.current) {
            balanceRef.current.textContent = `$${Math.round(latest).toLocaleString()}`;
        }
      });
      return unsubscribe;
    }, [springValue]);
  
    return <div ref={balanceRef} id="animated-balance" className="font-bold text-base md:text-lg">${value.toLocaleString()}</div>;
};

const ChatWindow = ({ onClose, messages, onSendMessage, playerUsername, isMobile }) => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
  
    const handleSend = (e) => {
      e.preventDefault();
      if (message.trim()) {
        onSendMessage(message);
        setMessage('');
      }
    };
  
    return (
      <motion.div 
        drag={!isMobile}
        dragMomentum={false}
        dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
        className={`bg-black/70 backdrop-blur-md shadow-2xl flex flex-col z-40 ${isMobile ? 'mobile-bottom-sheet' : 'absolute bottom-36 right-6 w-80 h-96 rounded-lg'}`}
        initial={{ opacity: 0, y: isMobile ? '100%' : 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isMobile ? '100%' : 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex justify-between items-center p-2 border-b border-white/20 cursor-move">
          <h3 className="font-bold text-sm">{t('chat')}</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><X size={16}/></button>
        </div>
        <div className="flex-1 p-2 overflow-y-auto text-sm space-y-2">
          {messages.map((msg, index) => (
            <p key={index}>
                <span className="text-gray-400 text-xs">[{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] </span>
                <span className={`font-bold ${msg.username === playerUsername ? 'text-green-400' : (msg.username === 'Dealer' ? 'text-yellow-400' : 'text-blue-400')}`}>{msg.username === 'Dealer' ? t('dealer_title') : msg.username}:</span> {msg.message}
            </p>
          ))}
        </div>
        <form onSubmit={handleSend} className="p-2 border-t border-white/20 flex gap-2">
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`${t('type_message')}...`}
            className="flex-1 bg-black/50 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-green-400"
          />
          <Button type="submit" size="icon" className="w-8 h-8 bg-green-600 hover:bg-green-700">
            <Send size={16} />
          </Button>
        </form>
      </motion.div>
    )
  }

const tableColors = [
  'blackjack-table-green',
  'blackjack-table-blue',
  'blackjack-table-red',
  'blackjack-table-purple',
];

const BettingStatus = ({ players }) => {
    const activePlayers = Object.values(players).filter(p => !p.isSpectating);
    const readyPlayersCount = activePlayers.filter(p => p.hasPlacedBet).length;
    const totalActivePlayers = activePlayers.length;

    if (totalActivePlayers === 0) return null;

    return (
        <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80px] bg-black/60 backdrop-blur-sm text-white px-6 py-2 rounded-lg shadow-lg z-30"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <p className="font-bold text-lg">Waiting for bets: {readyPlayersCount}/{totalActivePlayers} ready</p>
        </motion.div>
    );
};

const TurnIndicator = ({ activePlayerId, players, currentPlayerId }) => {
    const { t } = useTranslation();
    const activePlayer = activePlayerId ? players[activePlayerId] : null;
    
    let text = '';
    if (activePlayer) {
        if (activePlayer.id === currentPlayerId) {
            text = t('your_turn');
        } else {
            text = t('player_turn', { username: activePlayer.username });
        }
    }

    return (
        <AnimatePresence>
            {text && (
                <motion.div
                    className="absolute top-[1.5%] left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-6 py-2 rounded-full shadow-lg z-30"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <p className="font-bold text-lg">{text}</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ChipAnimation = ({ from, to, onComplete }) => {
    const chipImage = '/assets/chips/Casino_Chip_Red.svg';
    return (
      <motion.div
        className="absolute z-50 pointer-events-none"
        initial={{ x: from.x, y: from.y, opacity: 1, scale: 0.5 }}
        animate={{ x: to.x, y: to.y, opacity: 0, scale: 0.3 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        onAnimationComplete={onComplete}
      >
        <img src={chipImage} alt="chip" className="w-8 h-8" />
      </motion.div>
    );
};

const GameRoom = ({ onBackToHome }) => {
  const { player, gameMode, roomCode, updatePlayerBalance } = useContext(AppContext);
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tableColorIndex, setTableColorIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [hotkey, setHotkey] = useState(null);
  const [chipAnimations, setChipAnimations] = useState([]);
  const { playSound, isMuted, toggleMute } = useSound();
  const { width } = useWindowSize();
  const isMobile = width <= 600;
  const chatChannelRef = useRef(null);
  const playerSeatRefs = useRef({});

  const {
    players, dealerHand, gameStatus, balance, currentBet, sideBets, isHost, activePlayerId, myPlayerState, activeHandIndex,
    canHit, canStand, canDouble, canSplit, canSurrender,
    handleHit, handleStand, handleDouble, handleSplit, handleSurrender, handleNewRound,
    handlePlaceBet, handleDeal, handleClearBet, handleClearSideBet, handleLockBet, toggleSpectator,
    roundResult, getCardValue, handleMinBet, handleMaxBet, allBets,
    gameLog, roundCounter, handleKeepSideBetsToggle, keepSideBets, handleKeepMainBetToggle, keepMainBet,
    playerHands
  } = useBlackjackGame(gameMode, roomCode, player, player?.balance, playSound, updatePlayerBalance);

    useEffect(() => {
      if (gameStatus === 'roundOver' && roundResult) {
        const animations = [];
        const dealerPos = { x: window.innerWidth / 2, y: window.innerHeight * 0.2 };
  
        Object.keys(roundResult).forEach(pid => {
          const result = roundResult[pid];
          const seatRef = playerSeatRefs.current[pid];
          if (!seatRef?.current) return;
  
          const rect = seatRef.current.getBoundingClientRect();
          const playerPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  
          if (result.totalWinnings > 0) {
            animations.push({ id: `${pid}-win-${Date.now()}`, from: dealerPos, to: playerPos });
          } else if (result.totalWinnings < 0) {
            animations.push({ id: `${pid}-loss-${Date.now()}`, from: playerPos, to: dealerPos });
          }
        });
        setChipAnimations(animations);
      }
    }, [gameStatus, roundResult]);

  useEffect(() => {
    if (gameMode !== 'friend' || !roomCode || !player) return;

    const setupChat = async () => {
        const { data: room, error: roomError } = await supabase.from('game_rooms').select('id').eq('room_code', roomCode).maybeSingle();
        
        if (roomError) {
          console.error("Error fetching room for chat:", roomError);
          return;
        }
        
        if (!room) {
            setTimeout(setupChat, 1000);
            return;
        }

        const { data: initialMessages, error: msgError } = await supabase.from('chat_messages').select('*').eq('room_id', room.id).order('created_at', { ascending: true });
        if(msgError) console.error("Error fetching messages:", msgError);
        else setMessages(initialMessages || []);

        if (chatChannelRef.current) {
            supabase.removeChannel(chatChannelRef.current);
        }

        chatChannelRef.current = supabase.channel(`chat:${roomCode}`);
        chatChannelRef.current.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${room.id}`
        }, (payload) => {
            setMessages(prev => [...prev, payload.new]);
        }).subscribe();
    };
    
    setupChat();

    return () => {
        if (chatChannelRef.current) {
          supabase.removeChannel(chatChannelRef.current);
          chatChannelRef.current = null;
        }
    };
  }, [gameMode, roomCode, player]);

  const handleSendMessage = async (text) => {
    if (!roomCode || !player) return;
    const { data: room } = await supabase.from('game_rooms').select('id').eq('room_code', roomCode).single();
    if (!room) return;

    const { error } = await supabase.from('chat_messages').insert({
        room_id: room.id,
        user_id: player.id,
        username: player.username,
        message: text,
    });
    if (error) console.error("Error sending message:", error);
  };
  
  const handleKeyDown = useCallback((e) => {
    const target = e.target;
    if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea') return;

    const key = e.key.toLowerCase();
    let actionTaken = false;

    if (gameStatus === 'playing') {
      if (key === 'h' && canHit) { handleHit(); actionTaken = true; }
      else if (key === 's' && canStand) { handleStand(); actionTaken = true; }
      else if (key === 'd' && canDouble) { handleDouble(); actionTaken = true; }
      else if (key === 'p' && canSplit) { handleSplit(); actionTaken = true; }
      else if (key === 'u' && canSurrender) { handleSurrender(); actionTaken = true; }
    } else if (gameStatus === 'betting') {
      if (key === 'c') { handleClearBet(); actionTaken = true; }
    }

    if (actionTaken) {
      e.preventDefault();
      setHotkey(key);
      setTimeout(() => setHotkey(null), 200);
    }
  }, [gameStatus, canHit, canStand, canDouble, canSplit, canSurrender, handleHit, handleStand, handleDouble, handleSplit, handleSurrender, handleClearBet]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isInviteEnabled = gameMode === 'friend' && !!roomCode;

  const copyRoomCode = useCallback(async () => {
    const inviteLink = `${window.location.origin}/?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({ title: "Invite Link Copied!", description: `Room Code: ${roomCode}` });
    } catch (err) {
      console.error('Failed to copy: ', err);
      prompt('Copy this invite link:', inviteLink);
    }
  }, [roomCode]);

  const handleNextColor = () => setTableColorIndex((prev) => (prev + 1) % tableColors.length);

  const totalBet = (currentBet || 0) + Object.values(sideBets || {}).reduce((acc, bet) => acc + bet, 0);
  
  const numPlayers = isMobile ? 3 : 6;
  const mainPlayerIndex = isMobile ? 1 : 3;
  const tableRadiusX = isMobile ? 45 : 40;
  const tableRadiusY = isMobile ? 25 : 18;
  const tableCenterYOffset = isMobile ? 40 : 35;

  const getPlayerPosition = (index, total) => {
    const angle = Math.PI * (index / (total - 1));
    const x = 50 - tableRadiusX * Math.cos(angle);
    const y = tableCenterYOffset + tableRadiusY * Math.sin(angle);
    return { left: `${x}%`, top: `${y}%` };
  };

  const showDealerHoleCard = ['dealer', 'roundOver'].includes(gameStatus) || gameStatus === 'playerBust';
  
  const getDealerDisplayScore = () => {
    if (!dealerHand || !dealerHand.cards || dealerHand.cards.length === 0) return '—';
    if (!showDealerHoleCard) return getCardValue(dealerHand.cards[0]);
    return dealerHand.score;
  };

  if (gameStatus === 'loading' || (gameMode === 'friend' && (!player || !players || !players[player.id]))) {
      return (
          <div className="w-full h-screen flex-center flex-col bg-gray-900">
              <Loader2 className="w-12 h-12 animate-spin text-green-400" />
              <p className="mt-4 text-lg">Entering room {roomCode}...</p>
          </div>
      );
  }
  
  const playersInRoom = players ? Object.values(players) : [];
  const otherPlayers = playersInRoom.filter(p => p.id !== player?.id);
  let otherPlayerIndex = 0;

  const renderedPlayers = Array.from({ length: numPlayers }).map((_, i) => {
    const isMainPlayerSeat = i === mainPlayerIndex;
    let playerInSeat = null;
    
    if (isMainPlayerSeat) {
      playerInSeat = player;
    } else {
      playerInSeat = otherPlayers[otherPlayerIndex] || null;
      if (playerInSeat) {
        otherPlayerIndex++;
      }
    }
    
    if (playerInSeat && !playerSeatRefs.current[playerInSeat.id]) {
      playerSeatRefs.current[playerInSeat.id] = createRef();
    }
    
    const hands = playerInSeat ? (myPlayerState && playerInSeat.id === myPlayerState.id ? myPlayerState.hands : players[playerInSeat.id]?.hands) : [];
    const playerState = playerInSeat ? players[playerInSeat.id] : null;

    return {
      id: i,
      playerId: playerInSeat?.id,
      position: getPlayerPosition(i, numPlayers),
      isMainPlayer: isMainPlayerSeat,
      isActive: !!playerInSeat,
      username: playerInSeat ? playerInSeat.username : (isInviteEnabled ? t('empty_seat') : `${t('player_prefix')} ${i + 1}`),
      hands: hands || [],
      bets: playerInSeat ? allBets[playerInSeat.id] : null,
      playerState: playerState,
      isTurn: playerInSeat?.id === activePlayerId,
    };
  });


  const renderPlayerContent = (p) => {
    if (p.isMainPlayer || p.isActive) return null;
    if (isInviteEnabled) {
      return (
        <button onClick={copyRoomCode} className="w-full h-full flex items-center justify-center cursor-pointer group">
          <UserPlus size={32} className="text-green-300/50 group-hover:text-green-300 transition-colors" />
        </button>
      );
    }
    return <UserPlus size={32} className="text-green-300/50 opacity-50" />;
  };

  return (
    <>
    <div className={`fixed inset-0 flex flex-col text-gray-300 transition-colors duration-500 overflow-hidden ${tableColors[tableColorIndex]}`}>
      <motion.div 
        className="absolute left-0 top-0 bottom-0 bg-black/40 backdrop-blur-sm z-30 mobile-hidden"
        initial={{width: "50px"}}
        animate={{width: sidebarOpen ? "250px" : "50px"}}
        transition={{ ease: "easeInOut", duration: 0.3 }}
      >
        <div className="p-3.5 flex flex-col h-full">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mb-4">
              <ChevronRight className={`transition-transform duration-300 ${sidebarOpen ? "rotate-180" : ""}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <User size={20} />
            </div>
             {sidebarOpen && player && (
              <div className="mt-4 text-white">
                <p className="font-bold">{player.username}</p>
              </div>
            )}
        </div>
      </motion.div>

      <header className="game-header absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-2 md:px-6 z-20">
        <div className="flex items-center gap-1 md:gap-2">
          <Button onClick={onBackToHome} variant="ghost" className="bg-black/30 hover:bg-black/50 text-xs h-8 px-2 md:px-3">
            <ArrowLeft size={16} className="md:mr-2" /> <span className="mobile-hidden">{t('exit')}</span>
          </Button>
          <div className="group relative mobile-hidden">
            <Button id="btnInvite" onClick={copyRoomCode} variant="ghost" className="btn-invite bg-black/30 hover:bg-black/50 text-xs h-8 px-3" disabled={!isInviteEnabled}>
              <Copy size={16} className="mr-2" />
              {isInviteEnabled ? roomCode : t('invite')}
            </Button>
          </div>
        </div>
        
        <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          <div className="text-center">
            <p className="text-lg md:text-xl font-bold tracking-widest text-white/80">{t('dealer_title')}</p>
            <div className="bg-black/50 px-3 py-1 rounded-full text-base md:text-lg font-bold">
              {getDealerDisplayScore()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
           <div className="flex items-center gap-1.5">
            <button onClick={handleNextColor} className="w-5 h-5 rounded-full bg-white/20 border border-white/30" title={t('change_table_color')}></button>
          </div>
          <LanguageSwitcher />
          <Button onClick={() => setLogOpen(!logOpen)} variant="ghost" size="icon" className="bg-black/30 hover:bg-black/50 w-8 h-8"><History size={18} /></Button>
          <Button onClick={() => setChatOpen(!chatOpen)} variant="ghost" size="icon" className="bg-black/30 hover:bg-black/50 w-8 h-8"><MessageSquare size={18} /></Button>
          <Button onClick={toggleMute} variant="ghost" size="icon" className="bg-black/30 hover:bg-black/50 w-8 h-8">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          <Button onClick={() => setRulesOpen(true)} variant="ghost" className="bg-black/30 hover:bg-black/50 text-xs h-8 px-2 md:px-3">
            <HelpCircle size={16} className="md:mr-2" /> <span className="mobile-hidden">{t('rules')}</span>
          </Button>
        </div>
      </header>
      
      <main className={`relative flex-1 md:ml-[50px] pt-16 ${isMobile ? 'mobile-main-padding' : 'pb-32'}`}>
        <AnimatePresence>
            {gameStatus === 'roundOver' && roundResult && (
                <RoundSummary players={players} roundResult={roundResult} />
            )}
        </AnimatePresence>
        {gameStatus === 'playing' && <TurnIndicator activePlayerId={activePlayerId} players={players} currentPlayerId={player?.id} />}
        {gameStatus === 'betting' && players && <BettingStatus players={players} />}
        
        <div className="absolute top-[calc(4rem+2rem)] left-1/2 -translate-x-1/2 w-full flex justify-center z-0">
          <div className="relative flex justify-center h-28 md:h-36 w-full">
              <AnimatePresence>
                {dealerHand && dealerHand.cards && dealerHand.cards.map((card, index) => (
                  <PlayingCard key={card.id} card={card} hidden={index === 1 && !showDealerHoleCard} isDealerCard={true} cardIndex={index} />
                ))}
              </AnimatePresence>
          </div>
        </div>

        {renderedPlayers.map((p) => (
            <PlayerSeat
              key={p.id}
              ref={p.playerId ? playerSeatRefs.current[p.playerId] : null}
              position={p.position}
              isActive={p.isActive}
              isMainPlayer={p.isMainPlayer}
              username={p.username}
              hands={p.hands}
              bets={p.bets}
              isTurn={p.isTurn}
              playerState={p.playerState}
              roundResult={roundResult && roundResult[p.playerId]}
              activeHandIndex={p.playerId === activePlayerId ? activeHandIndex : -1}
            >
              {renderPlayerContent(p)}
            </PlayerSeat>
        ))}

        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 text-center text-green-300/50 font-bold banner-text">
          <p>{t('blackjack_pays')}</p>
          <p>{t('dealer_stands')}</p>
        </div>

        <AnimatePresence>
          {chipAnimations.map(anim => (
            <ChipAnimation 
              key={anim.id} 
              {...anim} 
              onComplete={() => setChipAnimations(prev => prev.filter(a => a.id !== anim.id))}
            />
          ))}
        </AnimatePresence>
      </main>

      <footer className={`z-20 ${isMobile ? 'fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 pb-[max(8px,env(safe-area-inset-bottom))]' : 'absolute bottom-0 left-0 right-0 h-32 bg-black/30 backdrop-blur-sm flex items-center justify-between px-6 md:ml-[50px]'}`}>
        <div className={`flex gap-2 ${isMobile ? 'absolute top-0 -translate-y-full left-2' : ''}`}>
          <div className="bg-black/50 p-2 rounded text-center w-24 md:w-28">
            <div className="text-xs text-gray-400">{t('balance')}</div>
            <AnimatedBalance value={balance} />
          </div>
          <div className="bg-black/50 p-2 rounded text-center w-24 md:w-28">
            <div className="text-xs text-gray-400">{t('total_bet')}</div>
            <div className="font-bold text-base md:text-lg text-yellow-400">${totalBet.toLocaleString()}</div>
          </div>
        </div>

        {myPlayerState && !myPlayerState.isSpectating && (
          <GameControls
            gameStatus={gameStatus} balance={balance} canHit={canHit} canStand={canStand} canDouble={canDouble}
            canSplit={canSplit} canSurrender={canSurrender} onHit={handleHit} onStand={handleStand}
            onDouble={handleDouble} onSplit={handleSplit} onSurrender={handleSurrender} onNewRound={handleNewRound}
            onPlaceBet={handlePlaceBet} onDeal={handleDeal} onClearBet={handleClearBet} onClearSideBet={handleClearSideBet}
            onLockBet={handleLockBet} myPlayerState={myPlayerState} isHost={isHost}
            currentBet={totalBet} sideBets={sideBets} playerHands={playerHands} hotkey={hotkey}
            isMobile={isMobile} onMinBet={handleMinBet} onMaxBet={handleMaxBet}
            onKeepSideBetsToggle={handleKeepSideBetsToggle} keepSideBets={keepSideBets}
            onKeepMainBetToggle={handleKeepMainBetToggle} keepMainBet={keepMainBet}
          />
        )}
        
        <div className={`flex items-center gap-2 ${isMobile ? 'absolute top-0 -translate-y-full right-2' : 'w-56 justify-end'}`}>
          {gameStatus === 'betting' && (
            <Button onClick={toggleSpectator} variant="ghost" className="bg-black/30 hover:bg-black/50 text-xs h-8 px-3">
              {myPlayerState?.isSpectating ? <Eye size={16} className="mr-2" /> : <EyeOff size={16} className="mr-2" />}
              {myPlayerState?.isSpectating ? "JOIN NEXT ROUND" : "SPECTATE"}
            </Button>
          )}
        </div>
      </footer>
      <AnimatePresence>
        {chatOpen && player && <ChatWindow onClose={() => setChatOpen(false)} messages={messages} onSendMessage={handleSendMessage} playerUsername={player.username} isMobile={isMobile} />}
        {logOpen && <GameLog onClose={() => setLogOpen(false)} log={gameLog} roundCounter={roundCounter} isMobile={isMobile} />}
      </AnimatePresence>
    </div>
    <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
};

export default GameRoom;
