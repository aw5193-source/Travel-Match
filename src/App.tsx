/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Settings as SettingsIcon, Globe, ArrowRight, AlertCircle } from 'lucide-react';
import { UserPreferences, LocationMatch, DetailedLocationInfo, TravelVibe, BudgetLevel } from './types';
import { getTravelMatches, getLocationDetails } from './services/travelApi';
import { PreferenceForm } from './components/PreferenceForm';
import { MapResults } from './components/MapResults';
import { DetailView } from './components/DetailView';
import { VerifiedImage } from './components/VerifiedImage';

const initialPrefs: UserPreferences = {
  vibe: [TravelVibe.RELAXING],
  budget: BudgetLevel.BUDGET,
  climate: 'warm',
  travelers: 'solo',
  interests: [],
  scenery: ['Mountains'],
  culture: ['Museums'],
  food: ['Local Specialties'],
  adventure: ['Hiking'],
  nightlife: ['Festivals'],
  priorities: {
    safety: true,
    comfort: false,
    accessibility: false,
    walkability: false,
    value: false
  },
  pace: 'relaxed',
  density: 'quiet',
  customDirectives: ''
};

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(initialPrefs);
  const [view, setView] = useState<'welcome' | 'quiz' | 'results'>('welcome');
  const [matches, setMatches] = useState<LocationMatch[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationMatch | null>(null);
  const [details, setDetails] = useState<DetailedLocationInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const topMatchesRef = useRef<HTMLElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.removeItem('travel_prefs');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view, selectedLocation]);

  useEffect(() => () => {
    if (scrollAnimationRef.current) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }
  }, []);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setMatches([]);
    setView('results');
    try {
      const results = await getTravelMatches(preferences);
      setMatches(results);
    } catch (error) {
      console.error("Analysis failed:", error);
      setErrorMessage(error instanceof Error ? error.message : 'The travel AI request failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectLocation = useCallback(async (location: LocationMatch) => {
    setSelectedLocation(location);
    setIsLoadingDetails(true);
    setDetailsError(null);
    try {
      const info = await getLocationDetails(location.name);
      setDetails(info);
    } catch (error) {
      console.error("Failed to load details:", error);
      setDetailsError(error instanceof Error ? error.message : 'The location details request failed.');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleMapPinClick = useCallback(() => {
    const topMatches = topMatchesRef.current;
    if (!topMatches) return;

    if (scrollAnimationRef.current) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }

    const headerOffset = 112;
    const startY = window.scrollY;
    const targetY = Math.max(
      0,
      topMatches.getBoundingClientRect().top + window.scrollY - headerOffset,
    );
    const distance = targetY - startY;

    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }

    const duration = Math.min(1700, Math.max(1050, Math.abs(distance) * 0.85));
    const startedAt = window.performance.now();
    const easeInOutCubic = (progress: number) =>
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const animate = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(animate);
      } else {
        scrollAnimationRef.current = null;
        window.scrollTo(0, targetY);
      }
    };

    scrollAnimationRef.current = window.requestAnimationFrame(animate);
  }, []);

  const closeDetails = () => {
    setSelectedLocation(null);
    setDetails(null);
    setDetailsError(null);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <AnimatePresence mode="wait">
        {selectedLocation ? (
          <DetailView 
            key="details"
            match={selectedLocation} 
            details={details} 
            onBack={closeDetails} 
            isLoading={isLoadingDetails} 
            errorMessage={detailsError}
          />
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            {/* Header */}
            <header className="px-8 py-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-100">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('welcome')}>
                <Compass className="w-6 h-6 text-zinc-900" />
                <span className="font-medium tracking-tight text-xl">Travel Match</span>
              </div>
              <button 
                onClick={() => setView('quiz')}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                title="Customize AI Preferences"
              >
                <SettingsIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </header>

            <main className="max-w-7xl mx-auto px-6">
              {view === 'welcome' && (
                <div className="py-20 flex flex-col items-center text-center space-y-12">
                  <div className="space-y-4 max-w-3xl">
                    <motion.h1 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-7xl md:text-9xl font-light tracking-tighter"
                    >
                      Your Perfect <br />
                      <span className="italic serif text-zinc-400">Destination</span>
                    </motion.h1>
                    <p className="text-xl text-zinc-500 font-light max-w-xl mx-auto">
                      AI-driven matches based on your personal travel style, preferred vibes, and deepest interests.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={startAnalysis}
                      className="group relative px-8 py-4 bg-zinc-900 text-white rounded-full overflow-hidden transition-all hover:pr-12"
                    >
                      <span className="relative z-10 font-medium">Quick Match</span>
                      <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                    <button 
                      onClick={() => setView('quiz')}
                      className="px-8 py-4 border border-zinc-200 rounded-full hover:bg-zinc-50 transition-colors font-medium"
                    >
                      Customize Profile
                    </button>
                  </div>

                  <div className="w-full max-w-4xl pt-20">
                     <div className="aspect-video rounded-[3rem] overflow-hidden bg-zinc-100 relative group">
                        <img 
                          src="https://picsum.photos/seed/travel-match-hero/1920/1080?grayscale" 
                          alt="Travel Hero" 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                        <div className="absolute bottom-12 left-12 flex items-center gap-3">
                           <Globe className="w-10 h-10 text-white animate-pulse" />
                           <span className="text-white text-sm font-mono tracking-widest uppercase">Waiting for your input</span>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {view === 'quiz' && (
                <div className="py-12">
                  <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
                    <h2 className="text-4xl font-light tracking-tight">Personalize Your AI</h2>
                    <p className="text-zinc-500 font-light">Set preferences for this search.</p>
                  </div>
                  <PreferenceForm 
                    preferences={preferences} 
                    onUpdate={setPreferences} 
                    onSubmit={startAnalysis} 
                  />
                </div>
              )}

              {view === 'results' && (
                <div className="py-12 space-y-12">
                  {isAnalyzing ? (
                    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8">
                       <div className="relative">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                            className="w-48 h-48 border-2 border-zinc-100 border-t-zinc-900 rounded-full"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Globe className="w-12 h-12 text-zinc-900" />
                          </div>
                       </div>
                       <div className="text-center space-y-2">
                          <h3 className="text-2xl font-light tracking-tight">Analyzing the Globe</h3>
                          <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest animate-pulse">Syncing with travel patterns...</p>
                       </div>
                    </div>
                  ) : errorMessage ? (
                    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-zinc-500" />
                      </div>
                      <div className="space-y-3 max-w-xl">
                        <h3 className="text-3xl font-light tracking-tight">Travel AI needs attention</h3>
                        <p className="text-zinc-500 font-light leading-relaxed">{errorMessage}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          onClick={() => setView('quiz')}
                          className="px-6 py-3 border border-zinc-200 rounded-full hover:bg-zinc-50 transition-colors font-medium"
                        >
                          Adjust Profile
                        </button>
                        <button
                          onClick={startAnalysis}
                          className="px-6 py-3 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors font-medium"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-16">
                      <MapResults matches={matches} onSelect={handleMapPinClick} />
                      
                      <section ref={topMatchesRef} className="space-y-8 scroll-mt-28">
                        <div className="flex justify-between items-end border-b border-zinc-100 pb-6">
                           <h2 className="text-3xl font-light tracking-tight">Top 5 Matches</h2>
                           <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Recommended for you</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {matches.map((match, i) => (
                            <motion.div
                              key={match.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              onClick={() => void handleSelectLocation(match)}
                              className="group cursor-pointer space-y-4"
                            >
                              <VerifiedImage
                                src={match.imageUrl}
                                sources={match.images}
                                alt={match.name}
                                className="aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-100 relative"
                                imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              >
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold shadow-xl border border-zinc-100">
                                  {match.matchScore}% Match
                                </div>
                              </VerifiedImage>
                              <div className="px-2 space-y-1">
                                <div className="flex justify-between items-start">
                                  <h3 className="text-2xl font-medium tracking-tight">{match.name}</h3>
                                  <span className="text-zinc-400 text-sm font-light">{match.country}</span>
                                </div>
                                <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2">
                                  {match.description}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              )}
            </main>

            <footer className="py-20 border-t border-zinc-100 mt-20 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Compass className="w-8 h-8 text-zinc-300" />
                <p className="text-zinc-400 text-sm font-light">
                  © 2026 Travel Match AI. Exploring the world, one preference at a time.
                </p>
                <div className="flex gap-6 text-zinc-300 text-xs uppercase tracking-widest font-medium">
                  <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                  <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
                  <a href="#" className="hover:text-zinc-900 transition-colors">Support</a>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
