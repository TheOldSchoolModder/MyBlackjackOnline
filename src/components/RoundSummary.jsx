import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const formatHandResult = (result) => {
  switch (result) {
    case 'win': return 'You Won';
    case 'blackjack': return 'Blackjack!';
    case 'dealerWin': return 'Dealer Won';
    case 'bust': return 'Bust!';
    case 'push': return 'Push';
    case 'surrender': return 'You Surrendered';
    default: return result;
  }
};

const RoundSummary = ({ result, player, players }) => {
  const [isVisible, setIsVisible] = useState(true);

  const myResult = result && player && result[player.id];
  
  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [result, player]);

  if (!myResult || !isVisible) return null;

  const { mainHandResult, mainHandPayout, sideBetResults, totalWinnings } = myResult;

  const getResultColor = (payout) => {
    if (payout > 0) return 'text-green-400';
    if (payout < 0) return 'text-red-500';
    return 'text-yellow-400';
  };

  const winningSideBets = (sideBetResults || []).filter(r => r.status === 'win' && r.payout > 0);
  const losingSideBets = (sideBetResults || []).filter(r => r.status === 'loss');

  const mainHandStatus = mainHandResult && mainHandResult.length > 0 ? formatHandResult(mainHandResult[0]) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, ease: 'backOut' }}
      className="result-toast"
    >
      <h2 className={`text-2xl font-bold mb-2 ${getResultColor(totalWinnings)}`}>
        {totalWinnings > 0 ? `You Won $${totalWinnings.toLocaleString()}` : totalWinnings < 0 ? `You Lost $${Math.abs(totalWinnings).toLocaleString()}` : 'Round Pushed'}
      </h2>
      
      <div className="space-y-2 text-sm">
        {mainHandStatus && (
          <p>
            Main Hand: <span className={`font-semibold ${getResultColor(mainHandPayout)}`}>{mainHandStatus}</span>
            {mainHandPayout !== 0 && ` ($${mainHandPayout > 0 ? '+' : ''}${mainHandPayout.toLocaleString()})`}
          </p>
        )}

        {winningSideBets.length > 0 && (
          <div>
            {winningSideBets.map(bet => (
              <p key={bet.name}>
                <span className="text-green-400 font-semibold">Won {bet.name}: +${bet.payout.toLocaleString()}</span>
              </p>
            ))}
          </div>
        )}

        {losingSideBets.length > 0 && winningSideBets.length === 0 && mainHandPayout <= 0 && totalWinnings < 0 && (
           <p className="text-red-500">You lost your side bets.</p>
        )}
      </div>
    </motion.div>
  );
};

export default RoundSummary;