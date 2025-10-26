import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import ChipMenu from '@/components/ChipMenu';
import { Lock, Play, Zap, Repeat, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSound } from '@/hooks/useSound';

const Chip = ({ value, colorClass, onClick, betType, sideBetName = null }) => {
  const { playSound } = useSound();
  return (
    <motion.button 
      onClick={() => {
        onClick(value, betType, sideBetName);
        playSound('bet', { debounce: true });
      }} 
      whileTap={{ scale: 0.9 }}
      className={`chip ${colorClass}`}
      aria-label={`Chip ${value}`}
    >
      <span className="text-white text-xs font-bold pointer-events-none">{value}</span>
    </motion.button>
  );
};

const SideBetSection = ({ title, description, betAmount, onBet, onClear, chips, sideBetName }) => (
  <div className="grid gap-2">
    <Label className="col-span-2 text-base font-semibold text-yellow-300">{title}</Label>
    <div className="flex justify-between items-center bg-black/20 p-2 rounded-md">
      <div className="flex items-center gap-2">
        {chips.map(chip => <Chip key={chip.value} {...chip} onClick={onBet} betType="side" sideBetName={sideBetName} />)}
      </div>
      <div className="text-right">
        <span className="font-bold text-lg text-yellow-400">${betAmount}</span>
        {betAmount > 0 && 
          <Button variant="link" className="p-0 h-auto text-xs text-red-400" onClick={onClear}>Clear</Button>
        }
      </div>
    </div>
    <p className="text-xs text-gray-400 mt-1">{description}</p>
  </div>
);


const ActionButton = ({ children, hotkeyTrigger, ...props }) => {
  const controls = useAnimation();
  useEffect(() => {
    if (hotkeyTrigger) {
      controls.start({ scale: [1, 0.9, 1], transition: { duration: 0.2 } });
    }
  }, [hotkeyTrigger, controls]);

  return (
    <motion.div animate={controls} className="flex-1">
      <Button {...props}>{children}</Button>
    </motion.div>
  );
};

const GameControls = ({
  gameStatus,
  onHit, onStand, onDouble, onSplit, onSurrender, onNewRound, onPlaceBet, onDeal, onClearBet,
  onLockBet, myPlayerState, isHost,
  currentBet, sideBets,
  canHit, canStand, canDouble, canSplit, canSurrender,
  playerHands,
  onInsurance,
  showInsurance,
  onEvenMoney,
  showEvenMoney,
  onClearSideBet,
  hotkey,
  isMobile,
  onMinBet,
  onMaxBet,
  onKeepSideBetsToggle,
  keepSideBets,
  onKeepMainBetToggle,
  keepMainBet
}) => {
  const [isLocking, setIsLocking] = useState(false);
  const { playSound } = useSound();
  const sideBetChips = [
    { value: 5, colorClass: 'chip-5' },
    { value: 10, colorClass: 'chip-10' },
    { value: 25, colorClass: 'chip-25' },
  ];
  
  const hasPlacedBet = myPlayerState?.hasPlacedBet || false;

  const handleLockBetClick = async () => {
    setIsLocking(true);
    await onLockBet();
    playSound('click');
    setIsLocking(false);
  };
  
  const createSoundHandler = (handler, soundName) => () => {
    handler();
    playSound(soundName || 'click');
  };

  if (gameStatus === 'betting') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center w-full ${isMobile ? 'flex-col gap-4' : 'justify-center gap-4'}`}>
        {isHost && (
             <Button onClick={() => onDeal(true)} className={`bg-blue-600 hover:bg-blue-700 font-bold ${isMobile ? 'w-full h-12 text-lg' : 'h-12 px-8 text-lg'}`}>
                <Zap className="mr-2 h-5 w-5" /> FORCE START
             </Button>
        )}

        <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
          <Popover>
            <PopoverTrigger asChild>
            <Button variant="outline" className={`text-white bg-black/30 border-yellow-400/50 hover:bg-black/50 hover:border-yellow-400/80 ${isMobile ? 'flex-1' : ''}`} disabled={hasPlacedBet}>Side Bets</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] max-w-[450px] bg-slate-900/90 backdrop-blur-sm border-yellow-500/30 text-white max-h-[70vh] overflow-y-auto">
            <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium leading-none text-yellow-300">Automatic Bets</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                      Automatically place your bets from the previous round.
                  </p>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between rounded-lg border p-4 bg-black/20">
                      <div className="space-y-0.5">
                        <Label htmlFor="keep-main-bet" className="text-base">Keep Main Bet</Label>
                        <p className="text-sm text-muted-foreground">Re-bet your previous main wager.</p>
                      </div>
                      <Switch id="keep-main-bet" checked={keepMainBet} onCheckedChange={onKeepMainBetToggle} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4 bg-black/20">
                      <div className="space-y-0.5">
                        <Label htmlFor="keep-side-bets" className="text-base">Keep Side Bets</Label>
                         <p className="text-sm text-muted-foreground">Re-bet your previous side bets.</p>
                      </div>
                      <Switch id="keep-side-bets" checked={keepSideBets} onCheckedChange={onKeepSideBetsToggle} />
                    </div>
                </div>
                 <div className="border-t border-gray-600 my-4"></div>
                 <div className="space-y-2">
                    <h4 className="font-medium leading-none text-yellow-300">Side Bets</h4>
                     <p className="text-sm text-muted-foreground">Place optional side bets for a chance to win big.</p>
                </div>
                <div className="space-y-4">
                  <SideBetSection 
                      title="Perfect Pairs"
                      description="Pays if your first two cards are a pair. Mixed: 5:1, Colored: 10:1, Perfect: 25:1."
                      betAmount={sideBets.perfectPairs || 0}
                      onBet={onPlaceBet}
                      onClear={() => onClearSideBet('perfectPairs')}
                      chips={sideBetChips}
                      sideBetName="perfectPairs"
                  />
                  <SideBetSection 
                      title="21+3"
                      description="Your first two cards and the dealer's upcard form a poker hand. Pays up to 40:1."
                      betAmount={sideBets.twentyOnePlusThree || 0}
                      onBet={onPlaceBet}
                      onClear={() => onClearSideBet('twentyOnePlusThree')}
                      chips={sideBetChips}
                      sideBetName="twentyOnePlusThree"
                  />
                  <SideBetSection 
                      title="Lucky Ladies"
                      description="Your first two cards total 20. Pays up to 1000:1 for two Queens of Hearts."
                      betAmount={sideBets.luckyLadies || 0}
                      onBet={onPlaceBet}
                      onClear={() => onClearSideBet('luckyLadies')}
                      chips={sideBetChips}
                      sideBetName="luckyLadies"
                  />
                  <SideBetSection 
                      title="Royal Match"
                      description="Your first two cards are suited. King-Queen suited pays 25:1."
                      betAmount={sideBets.royalMatch || 0}
                      onBet={onPlaceBet}
                      onClear={() => onClearSideBet('royalMatch')}
                      chips={sideBetChips}
                      sideBetName="royalMatch"
                  />
                   <SideBetSection 
                      title="Buster Blackjack"
                      description="Pays if the dealer busts. Payout increases with the number of cards in dealer's hand."
                      betAmount={sideBets.busterBlackjack || 0}
                      onBet={onPlaceBet}
                      onClear={() => onClearSideBet('busterBlackjack')}
                      chips={sideBetChips}
                      sideBetName="busterBlackjack"
                  />
                </div>
            </div>
            </PopoverContent>
          </Popover>
          <Button onClick={onClearBet} variant="destructive" className={`${isMobile ? 'flex-1' : ''}`} disabled={hasPlacedBet}>CLEAR</Button>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <Button onClick={createSoundHandler(onMinBet, 'bet')} variant="outline" className="font-bold" disabled={hasPlacedBet}>MIN</Button>
          <ChipMenu onPlaceBet={onPlaceBet} disabled={hasPlacedBet} />
          <Button onClick={createSoundHandler(onMaxBet, 'bet')} variant="outline" className="font-bold" disabled={hasPlacedBet}>MAX</Button>
        </div>
        
        <Button onClick={handleLockBetClick} disabled={currentBet < 10 || hasPlacedBet || isLocking} className={`bg-green-600 hover:bg-green-700 font-bold ${isMobile ? 'w-full h-12 text-lg' : 'h-12 px-8 text-lg'}`}>
          {isLocking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
          {hasPlacedBet ? 'BET LOCKED' : (isLocking ? 'LOCKING...' : 'LOCK BET')}
        </Button>
      </motion.div>
    );
  }

  if (showInsurance) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 w-full">
        <h3 className="text-xl font-bold text-yellow-300">Insurance?</h3>
        <div className="flex gap-4 w-full">
          <Button onClick={() => onInsurance(true)} className="bg-green-600 hover:bg-green-700 flex-1">Yes</Button>
          <Button onClick={() => onInsurance(false)} className="bg-red-600 hover:bg-red-700 flex-1">No</Button>
        </div>
      </motion.div>
    );
  }

  if (gameStatus === 'playing') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-center w-full">
        <ActionButton onClick={createSoundHandler(onSurrender)} disabled={!canSurrender} className="bg-gray-500 hover:bg-gray-600 w-full h-12 font-bold disabled:opacity-50" style={{fontSize: 'var(--button-font-size)'}} hotkeyTrigger={hotkey === 'u'}>Surr (U)</ActionButton>
        <ActionButton onClick={createSoundHandler(onHit, 'card')} disabled={!canHit} className="bg-green-600 hover:bg-green-700 w-full h-12 font-bold disabled:opacity-50" style={{fontSize: 'var(--button-font-size)'}} hotkeyTrigger={hotkey === 'h'}>Hit (H)</ActionButton>
        <ActionButton onClick={createSoundHandler(onStand)} disabled={!canStand} className="bg-red-600 hover:bg-red-700 w-full h-12 font-bold disabled:opacity-50" style={{fontSize: 'var(--button-font-size)'}} hotkeyTrigger={hotkey === 's'}>Stand (S)</ActionButton>
        <ActionButton onClick={createSoundHandler(onDouble, 'bet')} disabled={!canDouble} className="bg-blue-600 hover:bg-blue-700 w-full h-12 font-bold disabled:opacity-50" style={{fontSize: 'var(--button-font-size)'}} hotkeyTrigger={hotkey === 'd'}>Double (D)</ActionButton>
        <ActionButton onClick={createSoundHandler(onSplit, 'deal')} disabled={!canSplit} className="bg-yellow-500 hover:bg-yellow-600 text-black w-full h-12 font-bold disabled:opacity-50" style={{fontSize: 'var(--button-font-size)'}} hotkeyTrigger={hotkey === 'p'}>Split (P)</ActionButton>
      </motion.div>
    );
  }
  
  if (gameStatus === 'roundOver' && isHost) {
    return (
       <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 w-full">
        <Button onClick={onNewRound} className="bg-green-600 hover:bg-green-700 w-full h-12 text-lg font-bold">New Round</Button>
      </motion.div>
    )
  }

  return null;
};

export default React.memo(GameControls);