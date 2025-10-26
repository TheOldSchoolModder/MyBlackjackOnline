import React from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
    } from "@/components/ui/dialog";
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

    const RuleSection = ({ title, children }) => (
        <div className="space-y-2">
            <h4 className="font-semibold text-yellow-300">{title}</h4>
            <div className="text-sm text-gray-300 space-y-1">{children}</div>
        </div>
    );

    const PayoutTable = ({ rows }) => (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {rows.map(([item, payout]) => (
                <React.Fragment key={item}>
                    <span className="text-gray-400">{item}</span>
                    <span className="text-right font-mono">{payout}</span>
                </React.Fragment>
            ))}
        </div>
    );

    const RulesModal = ({ isOpen, onClose }) => {
      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="bg-slate-900/95 border-yellow-500/30 text-white max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-yellow-300 text-2xl">How to Play Blackjack</DialogTitle>
              <DialogDescription>
                Master the rules to beat the dealer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-4">
                <Tabs defaultValue="basics" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-black/30">
                    <TabsTrigger value="basics">Basics</TabsTrigger>
                    <TabsTrigger value="moves">Moves</TabsTrigger>
                    <TabsTrigger value="insurance">Insurance</TabsTrigger>
                    <TabsTrigger value="side-bets">Side Bets</TabsTrigger>
                </TabsList>
                <TabsContent value="basics" className="mt-4 space-y-4">
                    <RuleSection title="Objective">
                        <p>The goal is to beat the dealer's hand without going over 21. If your hand exceeds 21, you "bust" and lose your bet.</p>
                    </RuleSection>
                    <RuleSection title="Card Values">
                        <p>• Number cards (2-10) are worth their face value.</p>
                        <p>• Face cards (Jack, Queen, King) are each worth 10.</p>
                        <p>• Aces are worth 1 or 11, whichever is more favorable for your hand.</p>
                    </RuleSection>
                    <RuleSection title="The Deal">
                        <p>You and the dealer are both dealt two cards. One of the dealer's cards is face up (the "upcard"), and the other is face down.</p>
                    </RuleSection>
                    <RuleSection title="Blackjack">
                        <p>If your first two cards are an Ace and a 10-value card, you have Blackjack! This typically pays 3 to 2.</p>
                    </RuleSection>
                </TabsContent>
                <TabsContent value="moves" className="mt-4 space-y-4">
                    <RuleSection title="Hit">
                        <p>Take another card. You can hit as many times as you like until you stand or bust.</p>
                    </RuleSection>
                    <RuleSection title="Stand">
                        <p>Take no more cards. The dealer then plays their hand according to fixed rules (usually standing on 17 or more).</p>
                    </RuleSection>
                    <RuleSection title="Double Down">
                        <p>Double your initial bet and receive exactly one more card. This is a powerful move when you have a strong starting hand (like 10 or 11).</p>
                    </RuleSection>
                    <RuleSection title="Split">
                        <p>If your first two cards are a pair, you can split them into two separate hands. You must place a second bet equal to your first. Each hand is played independently.</p>
                    </RuleSection>
                    <RuleSection title="Surrender">
                        <p>Forfeit half your bet and end the hand immediately. This is a good option if you have a very weak hand and the dealer's upcard is strong.</p>
                    </RuleSection>
                </TabsContent>
                <TabsContent value="insurance" className="mt-4 space-y-4">
                    <RuleSection title="What is Insurance?">
                        <p>When the dealer's upcard is an Ace, you are offered "insurance." This is a side bet that the dealer has Blackjack.</p>
                    </RuleSection>
                    <RuleSection title="How it Works">
                        <p>The insurance bet costs half of your original wager. If the dealer has Blackjack, the insurance bet pays 2 to 1, and you break even on the hand (you lose your main bet but win the insurance bet). If the dealer does not have Blackjack, you lose the insurance bet, and the hand continues as normal.</p>
                    </RuleSection>
                    <RuleSection title="Even Money">
                        <p>If you have Blackjack and the dealer shows an Ace, you'll be offered "Even Money." This is the same as taking insurance. It guarantees you a 1:1 payout before the dealer checks their hole card, protecting you from a potential push if the dealer also has Blackjack.</p>
                    </RuleSection>
                </TabsContent>
                <TabsContent value="side-bets" className="mt-4 space-y-6">
                    <RuleSection title="Perfect Pairs">
                        <p>A bet on your first two cards being a pair.</p>
                        <PayoutTable rows={[
                            ["Perfect Pair (Same suit & rank)", "25:1"],
                            ["Colored Pair (Same color & rank)", "10:1"],
                            ["Mixed Pair (Different color & rank)", "5:1"],
                        ]} />
                    </RuleSection>
                    <RuleSection title="21+3">
                        <p>A bet on your first two cards and the dealer's upcard forming a 3-card poker hand.</p>
                         <PayoutTable rows={[
                            ["Suited Trips", "100:1"],
                            ["Straight Flush", "40:1"],
                            ["Three of a Kind", "30:1"],
                            ["Straight", "10:1"],
                            ["Flush", "5:1"],
                        ]} />
                    </RuleSection>
                    <RuleSection title="Lucky Ladies">
                        <p>A bet on your first two cards totaling 20.</p>
                         <PayoutTable rows={[
                            ["Two Queens of Hearts", "1000:1"],
                            ["Two Queens of Hearts (w/ Dealer BJ)", "200:1"],
                            ["Matched 20 (Suited & Ranked)", "25:1"],
                            ["Suited 20", "10:1"],
                            ["Any 20", "4:1"],
                        ]} />
                    </RuleSection>
                     <RuleSection title="Royal Match">
                        <p>A bet on your first two cards being the same suit.</p>
                         <PayoutTable rows={[
                            ["Royal Match (Suited K-Q)", "25:1"],
                            ["Suited Match", "2.5:1"],
                        ]} />
                    </RuleSection>
                     <RuleSection title="Buster Blackjack">
                        <p>A bet that the dealer will bust. Payouts increase with the number of cards in the dealer's busted hand.</p>
                         <PayoutTable rows={[
                            ["Bust with 8+ cards", "200:1"],
                            ["Bust with 7 cards", "50:1"],
                            ["Bust with 6 cards", "15:1"],
                            ["Bust with 5 cards", "4:1"],
                            ["Bust with 4 cards", "2:1"],
                            ["Bust with 3 cards", "1:1"],
                        ]} />
                    </RuleSection>
                </TabsContent>
                </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      );
    };

    export default RulesModal;