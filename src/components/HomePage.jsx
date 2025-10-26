import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, LogIn, Trophy, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { AppContext } from '@/context/AppContext';
import Leaderboard from '@/components/Leaderboard';

const AuthForm = () => {
  const { player } = useContext(AppContext);
  const { user, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { t } = useTranslation();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    if (isSigningUp) {
      if (!username) {
        toast({ title: "Username is required for sign up", variant: "destructive" });
        return;
      }
      await signUp(email, password, { data: { username } });
    } else {
      await signIn(email, password);
    }
  };

  if (user && player) {
    return (
      <div className="text-center">
        <p className="text-xl text-emerald-200 mb-4">{t('welcome_back', { username: player.username })}</p>
        <p className="text-lg text-white mb-4">{t('balance')}: <span className="font-bold">${player.balance.toLocaleString()}</span></p>
        <Button onClick={signOut} className="bg-red-600 hover:bg-red-700">
          <LogOut className="mr-2 h-4 w-4" /> {t('logout_button')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleAuthAction} className="space-y-4 max-w-sm mx-auto">
      <h3 className="text-2xl font-bold text-center text-emerald-300">{isSigningUp ? t('sign_up') : t('login_button')}</h3>
      {isSigningUp && (
        <div>
          <Label htmlFor="username" >{t('username_label')}</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('enter_username_placeholder')} className="bg-white/10 border-emerald-400/30 text-white placeholder:text-gray-400 mt-1" required />
        </div>
      )}
      <div>
        <Label htmlFor="email" >{t('email_label')}</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('enter_email_placeholder')} className="bg-white/10 border-emerald-400/30 text-white placeholder:text-gray-400 mt-1" required />
      </div>
      <div>
        <Label htmlFor="password">{t('password_label')}</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('enter_password_placeholder')} className="bg-white/10 border-emerald-400/30 text-white placeholder:text-gray-400 mt-1" required />
      </div>
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6">
        {isSigningUp ? t('sign_up') : t('login_button')}
      </Button>
      <Button variant="link" type="button" onClick={() => setIsSigningUp(!isSigningUp)} className="w-full text-emerald-300">
        {isSigningUp ? t('already_have_account') : t('need_an_account')}
      </Button>
    </form>
  );
};
  
const DailyBonus = ({ onRedeemBonus }) => {
    const { player } = useContext(AppContext);
    const { t } = useTranslation();

    if (!player || player.balance > 0) return null;

    const handleRedeem = () => {
        onRedeemBonus();
        toast({ title: 'Bonus Redeemed!', description: 'You received $1,000!' });
    };
    
    const canRedeem = !player.last_bonus || new Date() - new Date(player.last_bonus) > 24 * 60 * 60 * 1000;

    return (
        <div className="mt-8 p-6 bg-yellow-500/10 rounded-xl border border-yellow-500/30 text-center">
            <h3 className="text-xl font-bold text-yellow-300">{t('daily_bonus_title')}</h3>
            {canRedeem ? (
                <>
                    <p className="text-yellow-200 my-2">{t('daily_bonus_desc')}</p>
                    <Button onClick={handleRedeem} className="bg-yellow-500 hover:bg-yellow-600 text-black">{t('daily_bonus_redeem')}</Button>
                </>
            ) : (
                <p className="text-yellow-200 my-2">{t('daily_bonus_redeemed')}</p>
            )}
        </div>
    );
};

const HomePage = ({ onRedeemBonus }) => {
  const { player, handleStartGame } = useContext(AppContext);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const { t } = useTranslation();

  const handleCreateRoom = () => {
    setIsCreateDialogOpen(false);
    handleStartGame('friend');
  };

  const handleJoinRoom = () => {
    if (!roomCodeInput.trim()) {
      toast({ title: "Room code is required!", variant: 'destructive'});
      return;
    }
    setIsJoinDialogOpen(false);
    handleStartGame('friend', roomCodeInput);
  };
  
  const handlePracticeMode = () => handleStartGame('bot');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
      
      <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center space-y-8 relative z-10 max-w-4xl">
        <motion.h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          ♠️ Blackjack Royale ♥️
        </motion.h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 p-6 bg-white/5 rounded-xl backdrop-blur-sm border border-emerald-400/20">
          <AuthForm />
        </motion.div>

        {player && <DailyBonus onRedeemBonus={onRedeemBonus} />}
        
        {player && (
          <motion.div className="grid md:grid-cols-3 gap-6 mt-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild><motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}><div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-2xl cursor-pointer shadow-2xl border-2 border-purple-400/30 hover:border-purple-400/60 transition-all"><Plus className="w-16 h-16 mx-auto mb-4 text-purple-200" /><h3 className="text-2xl font-bold mb-2">{t('create_room_title')}</h3><p className="text-purple-200">{t('invite_placeholder')}</p></div></motion.div></DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/30"><DialogHeader><DialogTitle className="text-2xl text-purple-300">{t('create_room_title')}</DialogTitle></DialogHeader><div className="space-y-4 py-4"><p className="text-emerald-200">{t('create_room_desc')}</p><Button onClick={handleCreateRoom} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg py-6">{t('create_room_button')}</Button></div></DialogContent>
            </Dialog>
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild><motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}><div className="bg-gradient-to-br from-teal-600 to-cyan-700 p-8 rounded-2xl cursor-pointer shadow-2xl border-2 border-teal-400/30 hover:border-teal-400/60 transition-all"><LogIn className="w-16 h-16 mx-auto mb-4 text-teal-200" /><h3 className="text-2xl font-bold mb-2">{t('join_room_title')}</h3><p className="text-teal-200">{t('join_room_desc')}</p></div></motion.div></DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/30"><DialogHeader><DialogTitle className="text-2xl text-teal-300">{t('join_room_title')}</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div><Label htmlFor="joinRoomCode" className="text-emerald-200">{t('room_code')}</Label><Input id="joinRoomCode" type="text" placeholder={t('join_room_desc')} value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} className="bg-white/10 border-teal-400/30 text-white mt-2" maxLength={6}/></div><Button onClick={handleJoinRoom} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-lg py-6">{t('join_room_button')}</Button></div></DialogContent>
            </Dialog>
            <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} onClick={handlePracticeMode}><div className="bg-gradient-to-br from-amber-600 to-orange-700 p-8 rounded-2xl cursor-pointer shadow-2xl border-2 border-amber-400/30 hover:border-amber-400/60 transition-all"><Bot className="w-16 h-16 mx-auto mb-4 text-amber-200" /><h3 className="text-2xl font-bold mb-2">{t('practice_mode_title')}</h3><p className="text-amber-200">{t('practice_mode_desc')}</p></div></motion.div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-12">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-lg text-emerald-300 hover:text-white hover:bg-emerald-500/10">
                  <Trophy className="mr-2 h-5 w-5" /> {t('view_leaderboard')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-500/30 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-3xl text-yellow-300">{t('top_players')}</DialogTitle>
                  <DialogDescription>{t('leaderboard_desc')}</DialogDescription>
                </DialogHeader>
                <div className="py-4"><Leaderboard /></div>
              </DialogContent>
            </Dialog>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HomePage;