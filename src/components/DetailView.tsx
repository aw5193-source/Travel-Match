/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Hotel, Camera, Utensils, Calendar, Plus, AlertCircle } from 'lucide-react';
import { LocationMatch, DetailedLocationInfo } from '../types';
import { SubDetailView } from './SubDetailView';
import { VerifiedImage } from './VerifiedImage';

interface Props {
  match: LocationMatch;
  details: DetailedLocationInfo | null;
  onBack: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const DetailView: React.FC<Props> = ({
  match,
  details,
  onBack,
  isLoading,
  errorMessage,
}) => {
  const [selectedSubItem, setSelectedSubItem] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-t-2 border-white rounded-full"
        />
      </div>
    );
  }

  if (errorMessage || !details) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white border border-zinc-100 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h1 className="text-3xl font-light tracking-tight mb-3">Details could not load</h1>
        <p className="text-zinc-500 max-w-xl font-light leading-relaxed mb-8">
          {errorMessage || "The location details response was empty."}
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors font-medium"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-zinc-50 text-zinc-900 pb-20 relative"
    >
      <AnimatePresence>
        {selectedSubItem && (
          <SubDetailView 
            item={selectedSubItem} 
            onClose={() => setSelectedSubItem(null)} 
          />
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="relative h-[60vh] w-full bg-zinc-900">
        <VerifiedImage
          src={match.imageUrl}
          sources={match.images}
          alt={match.name}
          className="absolute inset-0"
          imageClassName="w-full h-full object-cover opacity-60"
          fallbackClassName="bg-zinc-900 text-zinc-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 to-transparent" />
        
        <div className="absolute top-8 left-8">
          <button 
            onClick={onBack}
            className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-colors text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute bottom-12 left-8 right-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl md:text-8xl font-light tracking-tighter text-zinc-900">{match.name}</h1>
            <p className="text-xl md:text-2xl text-zinc-600 mt-2 font-light">{match.country}</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-8 relative z-10 space-y-24">
        {/* Overview */}
        <section className="bg-white p-12 rounded-3xl shadow-xl border border-zinc-100">
          <p className="text-2xl leading-relaxed font-light text-zinc-700 italic">
            "{details.overview}"
          </p>
        </section>

        {/* Residential */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-zinc-400">
            <Hotel className="w-5 h-5" />
            <h2 className="text-sm font-medium uppercase tracking-widest">Recommended Stays</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {details.residential.map((stay, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedSubItem(stay)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 group cursor-pointer"
              >
                <VerifiedImage
                  src={stay.imageUrl}
                  sources={stay.images}
                  alt={stay.name}
                  className="aspect-[4/3] overflow-hidden relative"
                  imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                >
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                </VerifiedImage>
                <div className="p-6 space-y-2">
                  <span className="text-[10px] bg-zinc-100 px-2 py-1 rounded-full uppercase tracking-tighter text-zinc-500">{stay.type}</span>
                  <h3 className="text-xl font-medium">{stay.name}</h3>
                  <p className="text-zinc-500 text-sm line-clamp-2">{stay.description}</p>
                  <p className="text-xs font-mono text-zinc-400 pt-2">{stay.priceRange}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Views & Sites */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-zinc-400">
            <Camera className="w-5 h-5" />
            <h2 className="text-sm font-medium uppercase tracking-widest">Famous Views & Sites</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {details.places.map((place, i) => (
              <div 
                key={i} 
                className="space-y-4 group cursor-pointer"
                onClick={() => setSelectedSubItem(place)}
              >
                <VerifiedImage
                  src={place.imageUrl}
                  sources={place.images}
                  alt={place.name}
                  className="aspect-[3/4] rounded-2xl overflow-hidden relative"
                  imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                >
                  <div className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                </VerifiedImage>
                <div>
                  <h3 className="text-lg font-medium">{place.name}</h3>
                  <p className="text-zinc-500 text-sm line-clamp-3">{place.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Local Flavors */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-zinc-400">
            <Utensils className="w-5 h-5" />
            <h2 className="text-sm font-medium uppercase tracking-widest">Local Flavors</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {details.food.map((item, i) => (
              <div 
                key={i} 
                className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setSelectedSubItem(item)}
              >
                <VerifiedImage
                  src={item.imageUrl}
                  sources={item.images}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl overflow-hidden shrink-0"
                  imageClassName="w-full h-full object-cover"
                  fallbackClassName="[&_span]:hidden"
                />
                <div className="overflow-hidden">
                  <h3 className="text-md font-medium truncate group-hover:text-zinc-600 transition-colors">{item.name}</h3>
                  <p className="text-zinc-500 text-xs line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Events & Activities */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-zinc-400">
            <Calendar className="w-5 h-5" />
            <h2 className="text-sm font-medium uppercase tracking-widest">Current Events & Major Activities</h2>
          </div>
          <div className="grid md:grid-cols-1 gap-6">
            {details.activities.map((act, i) => (
              <div 
                key={i} 
                className="relative h-64 rounded-3xl overflow-hidden group cursor-pointer"
                onClick={() => setSelectedSubItem(act)}
              >
                <VerifiedImage
                  src={act.imageUrl}
                  sources={act.images}
                  alt={act.name}
                  className="absolute inset-0"
                  imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  fallbackClassName="bg-zinc-800 text-zinc-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center p-12 max-w-lg">
                  <h3 className="text-2xl font-light text-white mb-2">{act.name}</h3>
                  <p className="text-white/70 font-light line-clamp-2">{act.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" /> View Activity Details
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
};
