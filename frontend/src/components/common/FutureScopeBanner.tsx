import React from 'react';
import { Hourglass } from 'lucide-react';

/** Marks a page that is a preview of planned work, not backed by the ConsentScope backend yet. */
export const FutureScopeBanner: React.FC<{ what: string; needs: string }> = ({ what, needs }) => (
  <div className="p-4 rounded-2xl bg-[#13110A] border border-[#D4AF37]/35 flex items-start gap-3">
    <Hourglass className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
    <div className="text-xs text-[#C8BC98] leading-relaxed">
      <strong className="text-[#F5D76E]">Future scope — preview.</strong> {what}{' '}
      <span className="text-[#8E8F99]">To make it real: {needs}</span>
    </div>
  </div>
);
