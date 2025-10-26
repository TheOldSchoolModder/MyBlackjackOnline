import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { useDebounce } from '@/hooks/useDebounce';

const sounds = {
  bet: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/chip-bet.mp3',
  deal: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/card-deal.mp3',
  card: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/dealerflip.mp3',
  win: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/win.mp3',
  lose: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/lose.mp3',
  push: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/push.mp3',
  shuffle: 'https://cdn.jsdelivr.net/gh/TheOldSchoolModder/Sound-Files@main/shuffle.mp3',
  click: '/sounds/click.mp3?v=2',
};

const soundCache = {};

export const useSound = () => {
  const [isMuted, setIsMuted] = useState(() => {
    const savedMute = localStorage.getItem('blackjack_muted');
    return savedMute ? JSON.parse(savedMute) : false;
  });
  
  const audioUnlocked = useRef(false);
  const soundCacheRef = useRef({});
  const lastPlayed = useRef({});
  
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedPlaySoundRef = useRef(debounce((soundName) => {
    if (!isMuted && audioUnlocked.current) {
        const sound = soundCacheRef.current[soundName];
        if (sound && sound.state() === 'loaded') {
            sound.play();
        } else if (!sound) {
            console.warn(`Sound "${soundName}" not found or preloaded.`);
        }
    }
  }, 150));

  useEffect(() => {
    Howler.mute(isMuted);
    localStorage.setItem('blackjack_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  const preloadSounds = useCallback(() => {
    console.log("Preloading sounds...");
    Object.keys(sounds).forEach(key => {
      if (!soundCacheRef.current[key]) {
        soundCacheRef.current[key] = new Howl({
          src: [sounds[key]],
          volume: 0.7,
          preload: true,
          onloaderror: (id, err) => {
              console.warn(`Failed to load sound: ${key} (${sounds[key]}). Error:`, err);
          },
          onload: () => {
              // console.log(`Sound loaded: ${key}`);
          }
        });
      }
    });
  }, []);

  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current || typeof window === 'undefined') return;

    const unlock = async () => {
        try {
            await Howler.ctx.resume();
        } catch (e) {
            console.error("Audio context resume failed.", e);
        } finally {
            if (Howler.ctx.state === 'running') {
                audioUnlocked.current = true;
                console.log("Audio Unlocked!");
                preloadSounds();
                // Play and immediately pause a silent sound to help iOS
                const silence = new Howl({ src: ['data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATFVY//MUZAMAAAGkAAAAAAAAA0gAAAAAV1hY//MUZAYAAAGkAAAAAAAAA0gAAAAA']});
                silence.volume(0);
                silence.play();
                window.removeEventListener('click', unlock, true);
                window.removeEventListener('touchend', unlock, true);
                window.removeEventListener('keydown', unlock, true);
            }
        }
    };

    window.addEventListener('click', unlock, true);
    window.addEventListener('touchend', unlock, true);
    window.addEventListener('keydown', unlock, true);

    return () => {
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, [preloadSounds]);

  useEffect(() => {
    const cleanup = unlockAudio();
    return cleanup;
  }, [unlockAudio]);

  const playSound = useCallback((soundName, options = {}) => {
    if (!audioUnlocked.current) return;
    
    if (options.debounce) {
        debouncedPlaySoundRef.current(soundName);
        return;
    }

    if (!isMuted) {
        const sound = soundCacheRef.current[soundName];
        if (sound) {
            if(sound.playing()) {
                sound.stop();
            }
            sound.play();
        } else {
            console.warn(`Sound "${soundName}" not found or preloaded.`);
        }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { playSound, isMuted, toggleMute };
};