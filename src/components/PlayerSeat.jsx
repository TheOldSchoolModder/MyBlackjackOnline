import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayingCard from './PlayingCard';

const getResultColor = (payout) => {
  if (payout > 0) return 'text-green-400';
  if (payout < 0) return 'text-red-500';
  return 'text-yellow-400';
};

const ResultNotification = ({ result }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (result) {
            setIsVisible(true);
            const timer = setTimeout(() => setIsVisible(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [result]);

    if (!result) return null;
    const { mainHandPayout, sideBetResults, totalWinnings } = result;

    const winningSideBets = (sideBetResults || []).filter(r => r.payout > 0);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 1.1 }}
                    transition={{ duration: 0.5, ease: 'backOut' }}
                    className="absolute bottom-full mb-2 w-64 bg-black/70 backdrop-blur-md p-3 rounded-lg shadow-2xl z-20 border border-white/20"
                >
                    <h3 className={`text-lg font-bold mb-1 text-center ${getResultColor(totalWinnings)}`}>
                        {totalWinnings > 0 ? `+ $${totalWinnings}` : totalWinnings < 0 ? `- $${Math.abs(totalWinnings)}` : 'Push'}
                    </h3>
                    <div className="text-xs space-y-1">
                        <p>Main: <span className={getResultColor(mainHandPayout)}>${mainHandPayout > 0 ? '+':''}{mainHandPayout}</span></p>
                        {winningSideBets.map((res, i) => (
                           <p key={i}>{res.name}: <span className="text-green-400">+${res.payout}</span></p>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


const PlayerSeat = React.forwardRef(({
  position,
  isActive,
  isMainPlayer,
  username,
  hands,
  bets,
  isTurn,
  children,
  playerState,
  roundResult,
  activeHandIndex,
}, ref) => {
  const mainBet = bets?.main || 0;
  const sideBetsTotal = bets?.side ? Object.values(bets.side).reduce((sum, amount) => sum + amount, 0) : 0;

  const getSeatClass = () => {
    if (isTurn) return 'player-spot-turn';
    if (!isActive) return '';
    if (playerState?.isSpectating) return 'player-spot-spectating';
    if (playerState?.hasPlacedBet) return 'player-spot-locked';
    return 'player-spot-active';
  };

  return (
    <motion.div
      ref={ref}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      style={position}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative h-36 w-48 flex justify-center">
        <AnimatePresence>
          {hands && hands.map((hand, handIdx) => (
            <motion.div
              key={`hand-${handIdx}`}
              className="absolute"
              initial={{ x: 0 }}
              animate={{ x: (handIdx - (hands.length - 1) / 2) * 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <AnimatePresence>
                {hand.cards.map((card, cardIdx) => (
                  <PlayingCard 
                    key={`hand-${handIdx}-card-${card.id}`}
                    card={card}
                    cardIndex={cardIdx}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className={`player-spot ${getSeatClass()}`}>
        {isActive ? (
          <div className="text-center">
            <span className="font-bold text-sm text-white">{username}</span>
            {playerState?.isSpectating && <span className="block text-xs text-gray-400">Spectating</span>}
          </div>
        ) : children}
      </div>
      
      {isActive && (
        <div className="absolute top-[calc(100%+5px)] w-64 text-center flex flex-col items-center z-10">
          {/* Bets Display */}
          <div className="flex flex-col items-center mb-2">
            {playerState && !playerState.isSpectating && (
              <div className="bg-black/50 px-3 py-1 rounded-md text-yellow-400 font-bold text-xs">
                {mainBet > 0 || sideBetsTotal > 0 ? (
                  <>
                    <span>Bet: ${mainBet}</span>
                    {sideBetsTotal > 0 && <span className="ml-2">| Side: ${sideBetsTotal}</span>}
                  </>
                ) : <span className="text-gray-400 font-semibold">No Bet Placed</span>}
              </div>
            )}
          </div>

          {/* Hands Score Display */}
          {hands.length > 0 && hands[0].cards.length > 0 && (
            <div className="flex justify-center items-baseline gap-4">
              {hands.map((hand, handIdx) => (
                 <div key={handIdx} className={`bg-black/50 px-3 py-1 rounded-full text-lg font-bold transition-all ${isTurn && handIdx === activeHandIndex ? 'text-yellow-300 ring-2 ring-yellow-300' : 'text-white'}`}>
                    {hand.score}
                 </div>
              ))}
            </div>
          )}

          <ResultNotification result={roundResult} />
        </div>
      )}
    </motion.div>
  );
});

export default PlayerSeat;