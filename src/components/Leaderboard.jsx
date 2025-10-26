import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BarChart2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useTranslation } from '@/hooks/useTranslation';

const Leaderboard = () => {
    const { t } = useTranslation();
    const [leaders, setLeaders] = useState([]);
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    username,
                    balance,
                    player_stats (
                        total_won,
                        total_lost,
                        rounds_played,
                        rounds_won,
                        rounds_lost,
                        pushes,
                        busts,
                        blackjacks
                    )
                `)
                .order('balance', { ascending: false })
                .limit(10);
            
            if (error) {
                console.error("Error fetching leaderboard:", error);
                setLeaders([]);
            } else {
                // Filter out profiles that might not have player_stats yet
                const validLeaders = data.filter(d => d.player_stats && d.player_stats.length > 0);
                setLeaders(validLeaders);
            }
            setLoading(false);
        };
        fetchLeaders();

        const changes = supabase
            .channel('leaderboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchLeaders)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'player_stats' }, fetchLeaders)
            .subscribe();

        return () => {
            supabase.removeChannel(changes);
        };
    }, []);

    const togglePlayer = (username) => {
        setExpandedPlayer(expandedPlayer === username ? null : username);
    };

    if (loading) {
        return <div className="text-center text-white">{t('loading')}...</div>;
    }

    if (leaders.length === 0) {
        return <div className="text-center text-gray-400">{t('leaderboard_empty')}</div>
    }

    const formatStat = (value) => value != null ? value.toLocaleString() : '0';

    return (
        <div className="space-y-2 text-white">
            {leaders.map((p, i) => {
                const stats = p.player_stats[0] || {};
                const netProfit = (stats.total_won || 0) - (stats.total_lost || 0);
                const isExpanded = expandedPlayer === p.username;

                return (
                    <div key={p.username} className="bg-white/5 rounded-lg transition-colors hover:bg-white/10">
                        <div 
                            className="flex justify-between items-center p-3 cursor-pointer"
                            onClick={() => togglePlayer(p.username)}
                        >
                            <div className="flex items-center">
                                <span className="font-bold text-lg w-8">{i + 1}.</span>
                                <span className="font-semibold">{p.username}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-yellow-400">${formatStat(p.balance)}</span>
                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                </motion.div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 pt-2 border-t border-white/10">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-gray-300">
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('net_profit')}: <span className={`font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>${netProfit >= 0 ? '' : '-'}${formatStat(Math.abs(netProfit))}</span></div>
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('rounds_played')}: <span className="font-semibold text-white">{formatStat(stats.rounds_played)}</span></div>
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('rounds_won')}: <span className="font-semibold text-white">{formatStat(stats.rounds_won)}</span></div>
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('rounds_lost')}: <span className="font-semibold text-white">{formatStat(stats.rounds_lost)}</span></div>
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('blackjacks')}: <span className="font-semibold text-white">{formatStat(stats.blackjacks)}</span></div>
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('pushes')}: <span className="font-semibold text-white">{formatStat(stats.pushes)}</span></div>
                                            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('busts')}: <span className="font-semibold text-white">{formatStat(stats.busts)}</span></div>
                                            <div className="flex items-center gap-2 col-span-2 md:col-span-1"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('total_won')}: <span className="font-semibold text-green-400">${formatStat(stats.total_won)}</span></div>
                                            <div className="flex items-center gap-2 col-span-2 md:col-span-1"><BarChart2 className="w-4 h-4 text-emerald-400"/> {t('total_lost')}: <span className="font-semibold text-red-400">${formatStat(stats.total_lost)}</span></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

export default Leaderboard;