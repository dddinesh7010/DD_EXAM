import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ExamSession } from '../types';
import { Clock, Info, HelpCircle } from 'lucide-react';

interface TimeSpentBarProps {
  session: ExamSession;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

interface BarData {
  id: string;
  index: number;
  label: string;
  seconds: number;
  isActive: boolean;
  isAnswered: boolean;
  isBookmarked: boolean;
  isVisited: boolean;
}

export default function TimeSpentBar({ session, currentIndex, onNavigate }: TimeSpentBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Monitor container width using ResizeObserver for fluid responsive design
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const totalQuestions = session.questions.length;
  const totalSecondsSpent = Object.values(session.timeSpent).reduce((a, b) => a + b, 0);

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  useEffect(() => {
    if (!svgRef.current) return;

    // Margin and dimensions (highly compact)
    const margin = { top: 10, right: 12, bottom: 12, left: 12 };
    const height = 42;
    const chartWidth = Math.max(100, width - margin.left - margin.right);
    const chartHeight = height - margin.top - margin.bottom;

    // Prep data
    const data: BarData[] = session.questions.map((q, idx) => ({
      id: q.id,
      index: idx,
      label: `${idx + 1}`,
      seconds: session.timeSpent[q.id] || 0,
      isActive: idx === currentIndex,
      isAnswered: session.answers[q.id] !== undefined && session.answers[q.id] !== -1,
      isBookmarked: !!session.bookmarks[q.id],
      isVisited: !!session.visited[q.id],
    }));

    // Find max seconds for scaling, default to 15s if everything is 0
    const maxSeconds = Math.max(15, ...data.map((d) => d.seconds));

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main chart group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand<number>()
      .domain(data.map((_, i) => i))
      .range([0, chartWidth])
      .padding(0.18);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxSeconds])
      .range([0, chartHeight]); // Map up from bottom

    // Draw background tracks for each bar
    g.selectAll('.track')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'track')
      .attr('x', (_, i) => xScale(i) || 0)
      .attr('y', 0)
      .attr('width', xScale.bandwidth())
      .attr('height', chartHeight)
      .attr('rx', 2.5)
      .attr('ry', 2.5)
      .attr('fill', '#f1f5f9')
      .attr('stroke', (_, i) => (i === currentIndex ? '#bfdbfe' : '#e2e8f0'))
      .attr('stroke-width', (_, i) => (i === currentIndex ? 1 : 0.5))
      .style('cursor', 'pointer')
      .on('click', (_, d) => onNavigate(d.index));

    // Draw time spent bars
    g.selectAll('.time-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'time-bar')
      .attr('x', (_, i) => xScale(i) || 0)
      .attr('y', (d) => chartHeight - Math.max(3, yScale(d.seconds))) // Ensure minimum 3px height for visibility
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => Math.max(3, yScale(d.seconds)))
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', (d) => {
        if (d.isActive) return '#2563eb'; // Deep Blue for active
        if (d.seconds > 90) return '#ef4444'; // Red if spent > 90 seconds (warning)
        if (d.seconds > 45) return '#f59e0b'; // Amber if spent > 45 seconds (caution)
        if (d.isAnswered) return '#10b981'; // Emerald for answered questions
        if (d.isVisited) return '#64748b'; // Slate for visited questions
        return '#cbd5e1'; // Light slate for others
      })
      .attr('opacity', (d) => (d.isActive ? 1 : 0.85))
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke', '#000')
          .attr('stroke-width', 0.5);
        setHoveredIndex(d.index);
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', d.isActive ? 1 : 0.85)
          .attr('stroke', 'none');
        setHoveredIndex(null);
      })
      .on('click', (_, d) => onNavigate(d.index));

    // Draw active question accent rings
    g.selectAll('.active-ring')
      .data(data.filter((d) => d.isActive))
      .enter()
      .append('rect')
      .attr('class', 'active-ring')
      .attr('x', (d) => (xScale(d.index) || 0) - 1)
      .attr('y', -1)
      .attr('width', xScale.bandwidth() + 2)
      .attr('height', chartHeight + 2)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2')
      .style('pointer-events', 'none');

    // Draw Bookmark indicator dots on top of the tracks
    g.selectAll('.bookmark-indicator')
      .data(data.filter((d) => d.isBookmarked))
      .enter()
      .append('circle')
      .attr('cx', (d) => (xScale(d.index) || 0) + xScale.bandwidth() / 2)
      .attr('cy', -4)
      .attr('r', 1.8)
      .attr('fill', '#e11d48') // Rose-600
      .style('pointer-events', 'none');

    // Add labels under each track (Question number)
    g.selectAll('.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (_, i) => (xScale(i) || 0) + xScale.bandwidth() / 2)
      .attr('y', chartHeight + 9)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.isActive ? '#2563eb' : '#64748b'))
      .style('font-size', '8px')
      .style('font-weight', (d) => (d.isActive ? 'bold' : 'normal'))
      .style('cursor', 'pointer')
      .text((d) => d.label)
      .on('click', (_, d) => onNavigate(d.index));
  }, [width, session.timeSpent, currentIndex, session.questions, session.answers, session.bookmarks, session.visited]);

  // Determine label/readout text
  let readoutTitle = '';
  let readoutDetail = '';
  let readoutType: 'hover' | 'active' | 'summary' = 'active';

  if (hoveredIndex !== null) {
    const q = session.questions[hoveredIndex];
    const time = session.timeSpent[q.id] || 0;
    readoutTitle = `Question ${hoveredIndex + 1}`;
    readoutDetail = `${formatDuration(time)} spent (Click to jump)`;
    readoutType = 'hover';
  } else {
    const activeQ = session.questions[currentIndex];
    const activeTime = session.timeSpent[activeQ.id] || 0;
    readoutTitle = `Current Question ${currentIndex + 1}`;
    readoutDetail = `${formatDuration(activeTime)} spent in this turn`;
    readoutType = 'active';
  }

  return (
    <div 
      ref={containerRef} 
      className="bg-white border border-slate-200 rounded-lg p-2 shadow-xs select-none"
      id="time-spent-tracker-root"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
            Live Time-Spent Monitor
          </h3>
          <span className="text-[8px] bg-slate-100 font-mono text-slate-500 py-0.5 px-1.5 rounded-full font-bold">
            D3 Engine
          </span>
        </div>

        {/* Dynamic status read-out */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
            readoutType === 'hover' 
              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
              : 'bg-blue-50 text-blue-800 border border-blue-100'
          }`}>
            <span className="font-extrabold">{readoutTitle}:</span> {readoutDetail}
          </span>
          <span className="text-[9px] text-slate-500 font-medium hidden sm:inline">
            Total Spent: <strong className="text-slate-800 font-bold">{formatDuration(totalSecondsSpent)}</strong>
          </span>
        </div>
      </div>

      {/* SVG Canvas drawn by D3 */}
      <div className="relative">
        <svg 
          ref={svgRef} 
          width={width} 
          height={42} 
          className="overflow-visible block"
        />
      </div>

      {/* Mini Color Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pt-1.5 border-t border-slate-100 text-[8px] text-slate-500 font-medium">
        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded bg-blue-600 block shrink-0" /> Active
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded bg-[#10b981] block shrink-0" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded bg-slate-500 block shrink-0" /> Visited
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded bg-amber-500 block shrink-0" /> Moderate (&gt;45s)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded bg-red-500 block shrink-0" /> High (&gt;90s)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded bg-red-600 block shrink-0 border border-red-400" /> Bookmark Dot
        </span>
      </div>
    </div>
  );
}
