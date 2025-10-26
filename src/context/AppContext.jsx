
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useSound } from '@/hooks/useSound';

export const AppContext = createContext();

const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const AppProvider = ({ children }) => {
  const { user, profile, loading, updateProfile } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [gameMode, setGameMode] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [player, setPlayer] = useState(null);
  const { playSound } = useSound();
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  useEffect(() => {
    if (profile) {
      setPlayer({ id: profile.id, username: profile.username, balance: profile.balance, last_bonus: profile.last_bonus });
    } else {
      setPlayer(null);
    }
  }, [profile]);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = urlParams.get('room');
    if (roomCodeFromUrl && user) {
        handleStartGame('friend', roomCodeFromUrl);
    }
  }, [user]);

  const updatePlayerBalance = useCallback(async (amount) => {
    if (!player || typeof amount !== 'number') return;
    
    const newBalance = (player.balance || 0) + amount;
    const { error } = await updateProfile({ balance: newBalance });

    if (!error) {
        setPlayer(p => ({ ...p, balance: newBalance }));
    } else {
        console.error("Failed to update balance on server:", error);
    }
  }, [player, updateProfile]);

  const handleStartGame = useCallback(async (mode, code = null) => {
    if (!player) return; // Can't start a game if not logged in.
    setGameMode(mode);
    
    let newRoomCode = code;

    if (mode === 'friend') {
        if (!code) { // Creating a new room
            newRoomCode = generateRoomCode();
            const { error } = await supabase.from('game_rooms').insert({
                room_code: newRoomCode,
                host_id: player.id,
                game_state: { 
                    status: 'betting', 
                    players: {}, 
                    dealer: { cards: [], score: 0 }, 
                    roundCounter: 1 
                }
            });
            if (error) { console.error(error); return; }
        }
        
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('game_state')
          .eq('room_code', newRoomCode)
          .single();

        if (roomError || !roomData) {
            console.error('Room not found or error:', roomError);
            // Optionally redirect home with an error message
            window.history.pushState({}, '', '/');
            setCurrentView('home');
            return;
        }

    } else { // Practice mode
        newRoomCode = `PRACTICE-${player.id.substring(0, 4)}`;
    }
    
    setRoomCode(newRoomCode);
    window.history.pushState({}, '', `/?room=${newRoomCode}`);
    setCurrentView('game');
  }, [player]);

  const handleBackToHome = () => {
    setCurrentView('home');
    setGameMode(null);
    setRoomCode(null);
    window.history.pushState({}, '', '/');
  };

  const handleRedeemBonus = useCallback(async () => {
    if (!player || (player.last_bonus && new Date() - new Date(player.last_bonus) < 24 * 60 * 60 * 1000)) {
        return;
    }
    const newBalance = player.balance + 1000;
    const now = new Date().toISOString();
    
    const { error } = await updateProfile({ balance: newBalance, last_bonus: now });
    if (!error) {
        setPlayer(p => ({ ...p, balance: newBalance, last_bonus: now }));
        playSound('win');
    }
  }, [player, updateProfile, playSound]);

  const value = {
    currentView,
    gameMode,
    roomCode,
    player,
    loading,
    updatePlayerBalance,
    handleStartGame,
    handleBackToHome,
    handleRedeemBonus,
    language,
    setLanguage: (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
