import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Sparkles, Brain, Layers, Info } from 'lucide-react';

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
  const [selectedNode, setSelectedNode] = useState<{ name: string; details?: string; category?: string; depth?: number } | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data) return;

    const width = containerRef.current.clientWidth || 860;
    const height = Math.max(containerRef.current.clientHeight || 480, 480);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Zoom container
    const g = svg.append('g').attr('class', 'mindmap-root-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3.0])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial center transform
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width * 0.22, height * 0.5).scale(0.8)
    );

    // Hierarchy and tree layout with optimal vertical & horizontal spacing for deep trees
    const root = d3.hierarchy<MindMapNode>(data);
    const treeLayout = d3.tree<MindMapNode>().nodeSize([44, 240]);
    treeLayout(root);

    // Color mapper by category
    const getCategoryColor = (category?: string) => {
      switch (category) {
        case 'root':
          return '#0f172a'; // slate-900
        case 'tech':
          return '#2563eb'; // blue-600 (기술 스택 & 아키텍처)
        case 'stt_highlight':
          return '#7c3aed'; // violet-600 (실시간 발언 & STT 검증)
        case 'strength':
          return '#059669'; // emerald-600 (문제 해결력 & CS)
        case 'fit':
          return '#d97706'; // amber-600 (동아리 컬처핏 & 협업)
        default:
          return '#475569'; // slate-600
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
      .attr('stroke-width', (d: any) => (d.source.depth === 0 ? 3.2 : d.source.depth === 1 ? 2.2 : 1.4))
      .attr('stroke-opacity', (d: any) => (d.target.depth > 2 ? 0.5 : 0.75))
      .attr('stroke-dasharray', (d: any) => (d.target.depth > 2 ? '3,3' : 'none'));

    // Nodes
    const nodeGroup = g.selectAll('.mindmap-node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'mindmap-node cursor-pointer group')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .on('click', (event, d: any) => {
        event.stopPropagation();
        setSelectedNode({
          name: d.data.name,
          details: d.data.details || (d.depth === 0 ? '지원자 중심 역량 노드' : '면접관 상세 평가 분석 항목입니다.'),
          category: d.data.category,
          depth: d.depth
        });
      });

    // Node circles / badges
    nodeGroup.append('circle')
      .attr('r', (d: any) => (d.depth === 0 ? 18 : d.depth === 1 ? 12 : d.depth === 2 ? 8 : 6))
      .attr('fill', (d: any) => (d.depth === 0 ? '#0f172a' : '#ffffff'))
      .attr('stroke', (d: any) => getCategoryColor(d.data.category))
      .attr('stroke-width', (d: any) => (d.depth === 0 ? 4 : d.depth === 1 ? 3 : 2))
      .attr('class', 'transition-transform duration-150 group-hover:scale-125 shadow-xs');

    // Inner dot for deeper nodes
    nodeGroup.filter((d: any) => d.depth > 0)
      .append('circle')
      .attr('r', (d: any) => (d.depth === 1 ? 5 : d.depth === 2 ? 3.5 : 2.5))
      .attr('fill', (d: any) => getCategoryColor(d.data.category));

    // Node labels with high readability
    nodeGroup.append('text')
      .attr('dy', (d: any) => (d.depth === 0 ? -26 : 4))
      .attr('x', (d: any) => (d.depth === 0 ? 0 : d.children ? -16 : 14))
      .attr('text-anchor', (d: any) => (d.depth === 0 ? 'middle' : d.children ? 'end' : 'start'))
      .text((d: any) => d.data.name)
      .attr('font-size', (d: any) => (d.depth === 0 ? '14px' : d.depth === 1 ? '12px' : '11px'))
      .attr('font-weight', (d: any) => (d.depth <= 1 ? '700' : '500'))
      .attr('fill', (d: any) => (d.depth === 0 ? '#0f172a' : '#1e293b'))
      .attr('class', 'select-none pointer-events-none');

  }, [data]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy as any, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;
    const width = containerRef.current.clientWidth || 860;
    const height = Math.max(containerRef.current.clientHeight || 480, 480);
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(
      zoomBehaviorRef.current.transform as any,
      d3.zoomIdentity.translate(width * 0.22, height * 0.5).scale(0.8)
    );
  };

  const countTotalNodes = (node?: MindMapNode): number => {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      node.children.forEach(c => {
        count += countTotalNodes(c);
      });
    }
    return count;
  };

  const totalNodesCount = countTotalNodes(data);

  if (!data) {
    return (
      <div id="mindmap-empty" className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
        <Sparkles className="w-8 h-8 text-indigo-500 mb-2 animate-bounce" />
        <h4 className="font-bold text-slate-800 text-sm">생성된 마인드맵 데이터가 없습니다</h4>
        <p className="text-xs text-slate-600 mt-1 max-w-sm leading-relaxed">
          면접 STT 기록 및 평가 데이터를 AI가 심층 분석하여 다차원 지식 트리로 시각화합니다.
        </p>
        {onRefreshAI && (
          <button
            onClick={onRefreshAI}
            disabled={isLoading}
            className="mt-3 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isLoading ? 'AI 정밀 마인드맵 생성 중...' : '마인드맵 AI 생성하기'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="interactive-mindmap-container" className="relative w-full border border-slate-200 rounded-xl bg-gradient-to-b from-white to-slate-50/80 overflow-hidden shadow-xs">
      {/* Mindmap Control Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-600" />
          <span className="font-bold text-slate-900">
            {candidateName} 지원자 AI 다계층 역량 마인드맵
          </span>
          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
            총 {totalNodesCount}개 분석 노드
          </span>
        </div>

        {/* Zoom and Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleZoom(1.25)}
            title="확대 (Zoom In)"
            className="p-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            title="축소 (Zoom Out)"
            className="p-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="화면 중앙 맞춤"
            className="p-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onRefreshAI && (
            <button
              onClick={onRefreshAI}
              disabled={isLoading}
              className="ml-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              {isLoading ? '정밀 분석 중...' : 'AI 마인드맵 재분석'}
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="w-full h-[480px] relative">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Category Legend */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] text-slate-700 shadow-xs flex-wrap max-w-[80%]">
          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" /> 범례:
          </span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> 기술/아키텍처</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span> 면접 STT 실시간 검증</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> 문제 해결력 & CS</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> 동아리 컬처핏 & 협업</span>
        </div>

        {/* Interactive Node Info Box */}
        {selectedNode && (
          <div className="absolute top-3 right-3 max-w-sm bg-white/98 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs z-10 animate-fade-in space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{selectedNode.name}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {selectedNode.details || '추가 세부 정보가 없습니다.'}
            </p>
            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>계층 깊이: Level {selectedNode.depth ?? 1}</span>
              <span className="font-semibold text-purple-600">SmartLab AI 정밀 검증</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
