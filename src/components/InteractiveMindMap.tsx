import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Sparkles } from 'lucide-react';

interface InteractiveMindMapProps {
  data?: MindMapNode;
  candidateName: string;
  onRefreshAI?: () => void;
  isLoading?: boolean;
}

export const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({
  data,
  candidateName,
  onRefreshAI,
  isLoading = false
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ name: string; details?: string; category?: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data) return;

    const width = containerRef.current.clientWidth || 800;
    const height = Math.max(containerRef.current.clientHeight || 450, 420);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Zoom container
    const g = svg.append('g').attr('class', 'mindmap-root-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial center transform
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 4, height / 2).scale(0.85)
    );

    // Hierarchy and tree layout
    const root = d3.hierarchy<MindMapNode>(data);
    const treeLayout = d3.tree<MindMapNode>().nodeSize([60, 220]);
    treeLayout(root);

    // Color mapper by category
    const getCategoryColor = (category?: string) => {
      switch (category) {
        case 'root':
          return '#18181b'; // zinc-900
        case 'tech':
          return '#2563eb'; // blue-600
        case 'stt_highlight':
          return '#7c3aed'; // violet-600
        case 'strength':
          return '#059669'; // emerald-600
        case 'weakness':
          return '#dc2626'; // red-600
        case 'fit':
          return '#d97706'; // amber-600
        default:
          return '#4b5563'; // gray-600
      }
    };

    // Diagonal links
    const linkGenerator = d3.linkHorizontal<any, any>()
      .x((d: any) => d.y)
      .y((d: any) => d.x);

    g.selectAll('.mindmap-link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'mindmap-link')
      .attr('d', linkGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        const cat = d.target.data.category || d.source.data.category;
        return getCategoryColor(cat);
      })
      .attr('stroke-width', (d: any) => (d.source.depth === 0 ? 3 : 1.8))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d: any) => (d.target.depth > 2 ? '4,4' : 'none'));

    // Nodes
    const nodeGroup = g.selectAll('.mindmap-node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'mindmap-node cursor-pointer transition-transform')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedNode({
          name: d.data.name,
          details: d.data.details || (d.depth === 0 ? '지원자 중심 노드' : '면접 핵심 분석 포인트'),
          category: d.data.category
        });
      });

    // Node circles / badges
    nodeGroup.append('circle')
      .attr('r', (d: any) => (d.depth === 0 ? 16 : d.depth === 1 ? 11 : 7))
      .attr('fill', (d: any) => (d.depth === 0 ? '#18181b' : '#ffffff'))
      .attr('stroke', (d: any) => getCategoryColor(d.data.category))
      .attr('stroke-width', (d: any) => (d.depth === 0 ? 4 : 2.5))
      .attr('class', 'shadow-sm transition-all hover:scale-125');

    // Inner dot for deeper nodes
    nodeGroup.filter((d: any) => d.depth > 0)
      .append('circle')
      .attr('r', (d: any) => (d.depth === 1 ? 5 : 3))
      .attr('fill', (d: any) => getCategoryColor(d.data.category));

    // Node labels
    nodeGroup.append('text')
      .attr('dy', (d: any) => (d.depth === 0 ? -22 : 4))
      .attr('x', (d: any) => (d.depth === 0 ? 0 : d.children ? -16 : 14))
      .attr('text-anchor', (d: any) => (d.depth === 0 ? 'middle' : d.children ? 'end' : 'start'))
      .text((d: any) => d.data.name)
      .attr('font-size', (d: any) => (d.depth === 0 ? '14px' : d.depth === 1 ? '12px' : '11px'))
      .attr('font-weight', (d: any) => (d.depth <= 1 ? 'bold' : '500'))
      .attr('fill', '#1f2937')
      .attr('class', 'select-none pointer-events-none');

  }, [data]);

  const handleResetZoom = () => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = Math.max(containerRef.current.clientHeight || 450, 420);
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();
    svg.transition().duration(500).call(
      zoom.transform as any,
      d3.zoomIdentity.translate(width / 4, height / 2).scale(0.85)
    );
  };

  if (!data) {
    return (
      <div id="mindmap-empty" className="flex flex-col items-center justify-center p-8 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl text-center">
        <Sparkles className="w-8 h-8 text-indigo-500 mb-2 animate-bounce" />
        <h4 className="font-bold text-zinc-800 text-sm">생성된 마인드맵 데이터가 없습니다</h4>
        <p className="text-xs text-zinc-700 mt-1 max-w-sm">
          면접 STT 기록 및 평가 데이터를 AI가 분석하여 다차원 지식 트리로 시각화합니다.
        </p>
        {onRefreshAI && (
          <button
            onClick={onRefreshAI}
            disabled={isLoading}
            className="mt-3 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isLoading ? 'AI 분석 및 생성 중...' : '마인드맵 AI 생성하기'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="interactive-mindmap-container" className="relative w-full border border-zinc-200 rounded-xl bg-gradient-to-b from-white to-zinc-50 overflow-hidden shadow-xs">
      {/* Mindmap Control Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-100/90 border-b border-zinc-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="font-bold text-zinc-900">
            {candidateName} 지원자 AI 종합 분석 마인드맵 (D3 Interactive Tree)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetZoom}
            title="화면 중앙 초기화"
            className="p-1 text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onRefreshAI && (
            <button
              onClick={onRefreshAI}
              disabled={isLoading}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-[11px] flex items-center gap-1 transition-all shadow-xs"
            >
              <Sparkles className="w-3 h-3" />
              {isLoading ? '분석 중...' : 'AI 재분석'}
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="w-full h-[380px] relative">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Category Legend */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-[10px] text-zinc-600 shadow-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> 기술/서류</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-600"></span> 면접 STT</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> 핵심 강점</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600"></span> 추천 역할</span>
        </div>

        {/* Interactive Node Info Box */}
        {selectedNode && (
          <div className="absolute top-3 right-3 max-w-xs bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-zinc-300 shadow-md text-xs z-10 animate-fade-in">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-1.5 mb-1.5">
              <span className="font-bold text-zinc-900">{selectedNode.name}</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-zinc-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              {selectedNode.details || '추가 세부 정보가 없습니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
