/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { VerifiedImage } from './VerifiedImage';

interface SubDetailItem {
  name: string;
  description: string;
  imageUrl: string;
  images?: string[];
  sourceLink?: string;
  type?: string;
  priceRange?: string;
}

interface Props {
  item: SubDetailItem | null;
  onClose: () => void;
}

export const SubDetailView: React.FC<Props> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors backdrop-blur-md"
        >
          <X className="w-6 h-6 text-white md:text-black" />
        </button>

        {/* Gallery / Main Image */}
        <div className="w-full md:w-1/2 bg-zinc-100 flex flex-col">
          <div className="flex-1 overflow-hidden">
             <VerifiedImage
               src={item.imageUrl}
               sources={item.images}
               alt={item.name}
               className="w-full h-full"
               imageClassName="w-full h-full object-cover"
             />
          </div>
          {Boolean(item.images?.length) && (
            <div className="p-4 grid grid-cols-3 gap-2 shrink-0">
               {item.images?.map((img, i) => (
                 <VerifiedImage
                   key={i}
                   src={img}
                   alt={`${item.name} detail ${i + 1}`}
                   className="aspect-square rounded-xl overflow-hidden bg-zinc-200"
                   imageClassName="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                   fallbackClassName="[&_span]:hidden"
                 />
               ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto bg-white flex flex-col">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
               {item.type && (
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100">
                   {item.type} • {item.priceRange}
                 </span>
               )}
               <h2 className="text-4xl md:text-5xl font-light tracking-tighter text-zinc-900 leading-none">
                 {item.name}
               </h2>
            </div>

            <div className="space-y-6">
              <p className="text-lg leading-relaxed text-zinc-600 font-light">
                {item.description}
              </p>
              
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 italic text-zinc-400 text-sm">
                AI Intelligence suggests this destination aligns with over 90% of your current profile clusters.
              </div>
            </div>
          </div>

          <div className="pt-12 space-y-4">
             {item.sourceLink && (
               <a 
                 href={item.sourceLink} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center justify-between w-full p-5 bg-zinc-900 text-white rounded-2xl group hover:bg-black transition-all"
               >
                 <span className="font-medium">Explore Official Site</span>
                 <ExternalLink className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
               </a>
             )}
             <button 
               onClick={onClose}
               className="flex items-center justify-center w-full p-4 text-zinc-400 hover:text-zinc-600 transition-colors text-sm font-medium"
             >
               Back to Location Overview
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
