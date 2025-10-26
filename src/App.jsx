
import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/components/HomePage';
import GameRoom from '@/components/GameRoom';
import { AppContext } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';

const App = () => {
  const {
    currentView,
    handleBackToHome,
    updatePlayerBalance,
    language,
    handleRedeemBonus,
    player,
    loading,
  } = useContext(AppContext);

  const title = language === 'ja' ? 'ブラックジャック・ロワイヤル - 究極のカードゲーム体験' : 'Blackjack Royale - The Ultimate Card Game Experience';
  const description = language === 'ja' ? '友達とプライベートルームでブラックジャックをオンラインでプレイし、AIと練習し、リーダーボードを駆け上がろう。サイドベット、リアルなゲームプレイ、永続的なプレイヤーアカウントが特徴です。' : 'Play Blackjack online with friends in private rooms, practice against AI, and climb the leaderboard. Features side bets, realistic gameplay, and persistent player accounts.';

  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full h-screen flex-center flex-col bg-gray-900 text-white">
          <Loader2 className="w-12 h-12 animate-spin text-green-400" />
          <p className="mt-4 text-lg">Loading Game...</p>
        </div>
      );
    }

    if (currentView === 'home') {
      return <HomePage onRedeemBonus={handleRedeemBonus} />;
    }

    if (currentView === 'game' && player) {
      return <GameRoom onBackToHome={handleBackToHome} />;
    }
    
    // Fallback to home if state is inconsistent
    return <HomePage onRedeemBonus={handleRedeemBonus} />;
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="min-h-screen min-h-[100svh] bg-gray-900">
        {renderContent()}
        <Toaster />
      </div>
    </>
  );
};

export default App;
