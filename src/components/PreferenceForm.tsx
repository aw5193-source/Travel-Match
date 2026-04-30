/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserPreferences, TravelVibe, BudgetLevel } from '../types';
import { motion } from 'framer-motion';
import { 
  Compass, DollarSign, CloudSun, Users, Tag, 
  Camera, Landmark, Utensils, Zap, PartyPopper, 
  ShieldCheck, MapPin, Activity, Wind, Heart,
  MessageSquareText
} from 'lucide-react';

interface Props {
  preferences: UserPreferences;
  onUpdate: (prefs: UserPreferences) => void;
  onSubmit: () => void;
}

const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <section className="space-y-4 pb-8 border-b border-zinc-100 last:border-0">
    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" /> {title}
    </h3>
    {children}
  </section>
);

const MultiSelect = ({ options, activeItems, onToggle }: { options: string[], activeItems: string[], onToggle: (opt: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onToggle(opt)}
        className={`py-2 px-4 rounded-full border transition-all text-sm font-medium ${
          activeItems.includes(opt)
            ? 'bg-zinc-900 border-zinc-900 text-white shadow-md'
            : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

export const PreferenceForm: React.FC<Props> = ({ preferences, onUpdate, onSubmit }) => {
  const toggleArray = (key: keyof UserPreferences, value: any) => {
    const current = (preferences[key] as any[]) || [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onUpdate({ ...preferences, [key]: next });
  };

  const togglePriority = (key: keyof UserPreferences['priorities']) => {
    onUpdate({
      ...preferences,
      priorities: {
        ...(preferences.priorities || {}),
        [key]: !preferences.priorities?.[key]
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-6 bg-white rounded-[2.5rem] shadow-sm border border-zinc-100">
      <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
        
        {/* Core Profile */}
        <div className="space-y-12">
          <Section title="Vibe & Style" icon={Heart}>
            <MultiSelect 
              options={Object.values(TravelVibe)} 
              activeItems={preferences.vibe || []} 
              onToggle={(v) => toggleArray('vibe', v)} 
            />
          </Section>

          <Section title="Traveling As" icon={Users}>
             <div className="flex flex-wrap gap-2">
                {['solo', 'couple', 'family', 'friends'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdate({ ...preferences, travelers: t as any })}
                    className={`py-2 px-5 rounded-full border transition-all text-sm font-medium ${
                      preferences.travelers === t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
            </div>
          </Section>

          <Section title="Budget Range" icon={DollarSign}>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(BudgetLevel).map(budget => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => onUpdate({ ...preferences, budget })}
                  className={`py-2 px-3 rounded-xl border transition-all text-sm font-medium text-center ${
                    preferences.budget === budget ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200'
                  }`}
                >
                  {budget}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Scenery & Views" icon={Camera}>
             <MultiSelect 
              options={['Mountains', 'Skylines', 'Natural Beauty', 'Coastline', 'Deserts']} 
              activeItems={preferences.scenery || []} 
              onToggle={(v) => toggleArray('scenery', v)} 
            />
          </Section>

          <Section title="History & Culture" icon={Landmark}>
             <MultiSelect 
              options={['Museums', 'Historical Sites', 'Architecture', 'Art Galleries', 'Cultural Depth']} 
              activeItems={preferences.culture || []} 
              onToggle={(v) => toggleArray('culture', v)} 
            />
          </Section>
        </div>

        {/* Detailed Preferences */}
        <div className="space-y-12">
          <Section title="Food & Cuisine" icon={Utensils}>
             <MultiSelect 
              options={['Local Specialties', 'Street Food', 'Fine Dining', 'Food Variety', 'Vegan/Veg Friendly']} 
              activeItems={preferences.food || []} 
              onToggle={(v) => toggleArray('food', v)} 
            />
          </Section>

          <Section title="Activities & Adventure" icon={Activity}>
             <MultiSelect 
              options={['Hiking', 'Sports', 'Unique Experiences', 'Water Activities', 'Wildlife']} 
              activeItems={preferences.adventure || []} 
              onToggle={(v) => toggleArray('adventure', v)} 
            />
          </Section>

          <Section title="Nightlife & Events" icon={PartyPopper}>
             <MultiSelect 
              options={['Festivals', 'Concerts', 'Bars', 'Nightlife Energy', 'Local Celebrations']} 
              activeItems={preferences.nightlife || []} 
              onToggle={(v) => toggleArray('nightlife', v)} 
            />
          </Section>

          <Section title="Practical Priorities" icon={ShieldCheck}>
             <div className="flex flex-wrap gap-2">
                {Object.keys(preferences.priorities || {}).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePriority(key as any)}
                    className={`py-2 px-4 rounded-full border transition-all text-sm font-medium ${
                      preferences.priorities?.[key as keyof UserPreferences['priorities']]
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-zinc-200 text-zinc-400'
                    }`}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
             </div>
          </Section>

          <div className="grid grid-cols-2 gap-4">
             <Section title="Pace" icon={Wind}>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={preferences.pace}
                  onChange={(e) => onUpdate({ ...preferences, pace: e.target.value as any })}
                >
                  <option value="relaxed">Relaxed</option>
                  <option value="neutral">Balanced</option>
                  <option value="energetic">Energetic</option>
                </select>
             </Section>
             <Section title="Vibe Density" icon={MapPin}>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={preferences.density}
                  onChange={(e) => onUpdate({ ...preferences, density: e.target.value as any })}
                >
                  <option value="quiet">Quiet/Secluded</option>
                  <option value="neutral">Normal</option>
                  <option value="vibrant">Vibrant/Social</option>
                </select>
             </Section>
          </div>
        </div>
      </div>

      <Section title="Direct AI Instructions" icon={MessageSquareText}>
        <div className="space-y-4">
          <p className="text-sm text-zinc-400 font-light italic">
            Be specific! "Suggest only locations in Southeast Asia," "I prefer places with high-speed internet," or "I want to avoid very touristy spots."
          </p>
          <textarea
            placeholder="Type your specific travel constraints or special needs here..."
            className="w-full h-32 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-zinc-700 outline-none focus:border-zinc-900 transition-colors resize-none font-light leading-relaxed"
            value={preferences.customDirectives || ''}
            onChange={(e) => onUpdate({ ...preferences, customDirectives: e.target.value })}
          />
        </div>
      </Section>

      <div className="pt-12">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onSubmit}
          className="w-full bg-zinc-900 text-zinc-50 py-5 rounded-3xl text-xl font-medium shadow-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3"
        >
          <Compass className="w-6 h-6 animate-spin-slow" />
          Analyze Worldwide Matches
        </motion.button>
        <p className="text-center text-zinc-400 text-xs mt-6 font-light uppercase tracking-widest">
          AI will refine results based on all {Object.keys(preferences).length} parameters
        </p>
      </div>
    </div>
  );
};
