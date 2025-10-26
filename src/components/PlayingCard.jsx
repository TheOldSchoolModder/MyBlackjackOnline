import React from 'react';
import { motion } from 'framer-motion';

const PlayingCard = ({ card, hidden = false, isDealerCard = false, cardIndex = 0 }) => {

  const getCardImageUrl = (card) => {
    if (!card) return '';
    const baseUrl = 'https://raw.githubusercontent.com/TheOldSchoolModder/blackjackcards/refs/heads/main/';
    
    let suit = '';
    switch (card.suit) {
      case 'hearts': suit = 'Heart'; break;
      case 'diamonds': suit = 'Diamond'; break;
      case 'clubs': suit = 'Club'; break;
      case 'spades': suit = 'Spade'; break;
      default: suit = card.suit.charAt(0).toUpperCase() + card.suit.slice(1);
    }

    let value = '';
    switch (card.value) {
      case 'A': value = 'A'; break;
      case 'J': value = 'J'; break;
      case 'Q': value = 'Q'; break;
      case 'K': value = 'K'; break;
      default: value = card.value.toString();
    }
    
    return `${baseUrl}${suit}${value}.svg`;
  };

  const getTargetPosition = () => {
    let xOffset = 0;
    if (isDealerCard) {
      xOffset = (cardIndex - 0.5) * 40;
    } else { // Player card
      xOffset = cardIndex * 25;
    }
    return { x: xOffset, y: 0 };
  };

  const cardVariants = {
    initial: {
      x: 300, // Start from deck position (right side of screen)
      y: -250,
      opacity: 0,
      scale: 0.7,
      rotate: 30,
    },
    animate: (custom) => {
      const targetPos = getTargetPosition();
      return {
        x: targetPos.x,
        y: targetPos.y,
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
          delay: custom.delay,
          duration: 0.3, // 300ms
          ease: "easeInOut",
        },
      };
    },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  const customAnimationProps = { delay: card.dealDelay || 0 };
  const cardImageUrl = getCardImageUrl(card);
  const cardBackUrl = 'https://raw.githubusercontent.com/TheOldSchoolModder/blackjackcards/refs/heads/main/Card_back.svg';

  const shouldAnimate = card.dealDelay !== undefined && card.dealDelay !== null;

  return (
    <motion.div
      layoutId={card.id}
      custom={customAnimationProps}
      variants={cardVariants}
      initial={shouldAnimate ? "initial" : false}
      animate="animate"
      exit="exit"
      className="playing-card"
      style={{
        transformStyle: 'preserve-3d',
        zIndex: cardIndex,
      }}
    >
      <motion.div 
        className="card-face" 
        style={{ padding: 0, overflow: 'hidden', backfaceVisibility: 'hidden', rotateY: 180 }}
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ duration: 0.5, delay: (card.dealDelay || 0) + 0.3 }}
      >
        {cardImageUrl && <img src={cardImageUrl} alt={card ? `${card.value} of ${card.suit}` : 'Card'} className="w-full h-full object-cover" />}
      </motion.div>
      <motion.div 
        className="card-back" 
        style={{ backfaceVisibility: 'hidden', padding: 0, overflow: 'hidden' }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: hidden ? 0 : -180 }}
        transition={{ duration: 0.5, delay: (card.dealDelay || 0) + 0.3 }}
      >
        <img src={cardBackUrl} alt="Card back" className="w-full h-full object-cover" />
      </motion.div>
    </motion.div>
  );
};

export default React.memo(PlayingCard);