import React from 'react';
import { motion } from 'framer-motion';
import { X, History } from 'lucide-react';

const GameLog = ({ onClose, log, roundCounter, isMobile }) => {
  const groupedLog = log.reduce((acc, entry) => {
    const round = entry.message.startsWith('Round') ? parseInt(entry.message.split(' ')[1], 10) : acc.currentRound;
    if (round) acc.currentRound = round;
    
    const targetRound = round || acc.currentRound || roundCounter;

    if (!acc.rounds[targetRound]) {
      acc.rounds[targetRound] = [];
    }
    acc.rounds[targetRound].push(entry);
    return acc;
  }, { rounds: {}, currentRound: null });

  const sortedRounds = Object.keys(groupedLog.rounds).sort((a, b) => b - a);

  return (
    <motion.div
      drag={!isMobile}
      dragMomentum={false}
      dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
      className={`bg-black/70 backdrop-blur-md shadow-2xl flex flex-col z-40 ${isMobile ? 'mobile-bottom-sheet' : 'absolute bottom-36 right-6 w-96 h-[500px] rounded-lg'}`}
      initial={{ opacity: 0, y: isMobile ? '100%' : 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isMobile ? '100%' : 50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex justify-between items-center p-2 border-b border-white/20 cursor-move">
        <h3 className="font-bold text-sm flex items-center gap-2"><History size={16} /> Game Log</h3>
        <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><X size={16}/></button>
      </div>
      <div className="flex-1 p-2 overflow-y-auto text-sm space-y-2">
        {sortedRounds.map(roundNum => (
          <details key={roundNum} open={parseInt(roundNum, 10) === roundCounter}>
            <summary className="font-bold text-yellow-300 cursor-pointer">Round {roundNum}</summary>
            <div className="pl-4 border-l-2 border-gray-600 ml-2 mt-1 space-y-1">
              {groupedLog.rounds[roundNum].map((entry, index) => {
                if (entry.message.startsWith('Round')) return null;
                return (
                  <p key={index} className="text-gray-300">
                    <span className="text-gray-500 text-xs mr-1">[{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                    {entry.username && <span className="font-semibold text-blue-400 mr-1">{entry.username}:</span>}
                    {entry.message}
                  </p>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </motion.div>
  );
};

export default GameLog;