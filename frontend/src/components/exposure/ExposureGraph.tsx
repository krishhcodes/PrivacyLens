import React, { useState, useMemo } from 'react';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Filter, 
  Search, 
  X, 
  ExternalLink
} from 'lucide-react';
import type { ExposureNode, ExposureLink, ExposureNodeType } from '../../types';
import { MOCK_EXPOSURE_GRAPH } from '../../data/mockExposure';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { SeverityBadge } from '../common/SeverityBadge';

interface ExposureGraphProps {
  onSelectAppOrigin?: (origin: string) => void;
}

export const ExposureGraph: React.FC<ExposureGraphProps> = ({ onSelectAppOrigin }) => {
  const [selectedNode, setSelectedNode] = useState<ExposureNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panDrag = React.useRef({ active: false, x: 0, y: 0, originX: 0, originY: 0 });

  const { nodes, links } = MOCK_EXPOSURE_GRAPH;

  // Filter nodes according to type and search
  const visibleNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesType = filterType === 'all' || node.type === filterType;
      const matchesSearch =
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.sublabel || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [nodes, filterType, searchQuery]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  // Connected nodes map for hover highlighting
  const connectedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    links.forEach(link => {
      if (!map.has(link.source)) map.set(link.source, new Set());
      if (!map.has(link.target)) map.set(link.target, new Set());
      map.get(link.source)!.add(link.target);
      map.get(link.target)!.add(link.source);
    });
    return map;
  }, [links]);

  const isConnectedToHovered = (nodeId: string) => {
    if (!hoveredNodeId) return false;
    if (nodeId === hoveredNodeId) return true;
    return connectedMap.get(hoveredNodeId)?.has(nodeId) || false;
  };

  const isLinkActive = (link: ExposureLink) => {
    if (!hoveredNodeId) return false;
    return link.source === hoveredNodeId || link.target === hoveredNodeId;
  };

  // Layout calculations: arrange in 5 distinct vertical columns
  const columnTiers: { type: ExposureNodeType; x: number; label: string }[] = [
    { type: 'identity', x: 80, label: 'Identity Core' },
    { type: 'app', x: 280, label: 'Applications' },
    { type: 'permission', x: 500, label: 'Permissions' },
    { type: 'data_type', x: 720, label: 'Data Categories' },
    { type: 'third_party', x: 940, label: 'Brokers & Ad Networks' }
  ];

  // Assign Y positions evenly within each column
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const height = 620;

    columnTiers.forEach(col => {
      const colNodes = nodes.filter(n => n.type === col.type);
      const count = colNodes.length;
      colNodes.forEach((node, index) => {
        const spacing = height / (count + 1);
        const y = spacing * (index + 1);
        positions.set(node.id, { x: col.x, y });
      });
    });

    return positions;
  }, [nodes]);

  const getNodeColor = (node: ExposureNode) => {
    if (node.type === 'identity') return '#D4AF37';
    if (node.type === 'app') {
      if (node.id === 'node-app-calc') return '#FF5D6C'; // Pocketcalc highlight
      return '#38BDF8';
    }
    if (node.type === 'permission') {
      if (node.id === 'node-perm-location') return '#FF5D6C';
      return '#A78BFA';
    }
    if (node.type === 'data_type') return '#FBBF24';
    if (node.type === 'third_party') return '#F43F5E';
    return '#D4AF37';
  };

  return (
    <div className="relative bg-[#090A0F] rounded-2xl border border-[#D4AF37]/25 overflow-hidden shadow-2xl flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-[#0D0E15] border-b border-[#D4AF37]/20 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
            <Network className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide font-['Cinzel',serif]">
              Data Exposure Mesh Topology
            </h2>
            <p className="text-[11px] text-[#8E8F99]">
              Visualizing propagation paths from Origin to Data Brokers
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Node Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find entity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-[#151622] border border-white/10 rounded-lg text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#D4AF37] font-mono w-36"
            />
          </div>

          {/* Filter Tier */}
          <div className="flex items-center gap-1.5 bg-[#151622] px-2.5 py-1 rounded-lg border border-white/10 text-xs">
            <Filter className="w-3 h-3 text-[#D4AF37]" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-transparent text-xs text-[#E8E8EE] outline-none font-mono"
            >
              <option value="all" className="bg-[#12131A]">All Tiers</option>
              <option value="app" className="bg-[#12131A]">Applications</option>
              <option value="permission" className="bg-[#12131A]">Permissions</option>
              <option value="data_type" className="bg-[#12131A]">Data Categories</option>
              <option value="third_party" className="bg-[#12131A]">Brokers / Trackers</option>
            </select>
          </div>

          {/* Zoom & Reset Controls */}
          <div className="flex items-center gap-1 bg-[#151622] p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.6))}
              className="p-1 text-[#8E8F99] hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.7))}
              className="p-1 text-[#8E8F99] hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPan({ x: 0, y: 0 });
                setFilterType('all');
                setSearchQuery('');
                setSelectedNode(null);
                setHoveredNodeId(null);
              }}
              className="p-1 text-[#8E8F99] hover:text-[#D4AF37] hover:bg-white/5 rounded transition-colors"
              title="Fit / reset view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers Legend */}
      <div className="grid grid-cols-5 bg-[#0C0D14] border-b border-white/5 px-6 py-2 text-[10px] font-mono tracking-wider text-[#A89874] uppercase text-center">
        <span>1. User Identity</span>
        <span>2. Applications</span>
        <span>3. Permissions</span>
        <span>4. Exposed Data</span>
        <span>5. Data Brokers / Admob</span>
      </div>

      {/* SVG Canvas Area */}
      <div
        className={`exposure-canvas relative w-full h-[640px] overflow-hidden bg-[#07080C] flex items-center justify-center p-4 ${panning ? 'is-panning' : ''}`}
        data-native-cursor
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('[data-node]')) return;
          panDrag.current = { active: true, x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
          setPanning(true);
        }}
        onPointerMove={(event) => {
          if (!panDrag.current.active) return;
          setPan({
            x: panDrag.current.originX + (event.clientX - panDrag.current.x),
            y: panDrag.current.originY + (event.clientY - panDrag.current.y)
          });
        }}
        onPointerUp={() => {
          panDrag.current.active = false;
          setPanning(false);
        }}
        onPointerLeave={() => {
          panDrag.current.active = false;
          setPanning(false);
        }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#D4AF37 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div
          className="origin-center"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
        >
          <svg
            width="1040"
            height="640"
            viewBox="0 0 1040 640"
            className="overflow-visible"
          >
            {/* Draw Links */}
            <g className="links">
              {links.map((link, index) => {
                const sourcePos = nodePositions.get(link.source);
                const targetPos = nodePositions.get(link.target);
                if (!sourcePos || !targetPos) return null;

                const isSelectedPath =
                  selectedNode && (link.source === selectedNode.id || link.target === selectedNode.id);
                const isActive = isLinkActive(link) || Boolean(isSelectedPath);
                const isHoverActive = hoveredNodeId !== null || Boolean(selectedNode);
                const opacity = isHoverActive ? (isActive ? 1 : 0.1) : 0.38;
                const strokeColor = link.severity === 'high' ? '#FF5D6C' : '#D4AF37';

                // Cubic Bezier curve between source and target
                const dx = targetPos.x - sourcePos.x;
                const pathD = `M ${sourcePos.x + 20} ${sourcePos.y} C ${sourcePos.x + dx / 2} ${sourcePos.y}, ${targetPos.x - dx / 2} ${targetPos.y}, ${targetPos.x - 20} ${targetPos.y}`;
                const pathId = `flow-path-${index}`;

                return (
                  <g key={`link-${index}`}>
                    <path
                      id={pathId}
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isActive ? 3 : 1.5}
                      strokeOpacity={opacity}
                      strokeDasharray={isActive ? '6 8' : '3 10'}
                      className="transition-all duration-300"
                      style={{ animation: isActive ? 'dashFlow 1.2s linear infinite' : 'dashFlow 2.4s linear infinite' }}
                    />
                    {isActive && (
                      <circle r="3.5" fill="#F5D76E" opacity="0.9">
                        <animateMotion dur="1.6s" repeatCount="indefinite" rotate="auto">
                          <mpath href={`#${pathId}`} />
                        </animateMotion>
                      </circle>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Draw Nodes */}
            <g className="nodes">
              {nodes.map(node => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                if (!visibleNodeIds.has(node.id)) return null;
                const isHovered = hoveredNodeId === node.id;
                const isConnected = isConnectedToHovered(node.id);
                const isSelected = selectedNode?.id === node.id;
                const hasHover = hoveredNodeId !== null;

                const opacity = hasHover ? (isHovered || isConnected ? 1 : 0.25) : 1;
                const color = getNodeColor(node);

                return (
                  <g
                    key={node.id}
                    data-node
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-pointer transition-all duration-200"
                    style={{ opacity }}
                  >
                    {/* Glowing outer halo if hovered or selected */}
                    {(isHovered || isSelected) && (
                      <circle
                        r="32"
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        className="animate-ping"
                      />
                    )}

                    {node.type === 'permission' ? (
                      <rect
                        x="-18"
                        y="-18"
                        width="36"
                        height="36"
                        rx="4"
                        transform="rotate(45)"
                        fill="#10111A"
                        stroke={isSelected ? '#F5D76E' : isHovered ? color : '#2A2B3D'}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    ) : node.type === 'third_party' ? (
                      <polygon
                        points="0,-24 21,-8 13,20 -13,20 -21,-8"
                        fill="#10111A"
                        stroke={isSelected ? '#F5D76E' : isHovered ? color : '#2A2B3D'}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    ) : (
                      <circle
                        r={node.type === 'identity' ? 24 : 22}
                        fill="#10111A"
                        stroke={isSelected ? '#F5D76E' : isHovered ? color : '#2A2B3D'}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    )}

                    {/* Node icon text */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      className="select-none pointer-events-none"
                    >
                      {node.icon}
                    </text>

                    {/* Node Label Card below circle */}
                    <foreignObject
                      x="-70"
                      y="26"
                      width="140"
                      height="50"
                      className="pointer-events-none overflow-visible"
                    >
                      <div className="flex flex-col items-center text-center">
                        <span
                          className={`text-[11px] font-semibold tracking-tight truncate max-w-[130px] ${
                            isSelected ? 'text-[#F5D76E]' : 'text-white'
                          }`}
                        >
                          {node.label}
                        </span>
                        <span className="text-[9px] text-[#8E8F99] font-mono truncate max-w-[120px]">
                          {node.sublabel}
                        </span>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 bg-[#0F1018]/95 backdrop-blur-xl border border-[#D4AF37]/40 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedNode.icon}</span>
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {selectedNode.label}
                  </h3>
                  <span className="text-[10px] text-[#A89874] font-mono">
                    {selectedNode.sublabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#71717A] hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8E8F99]">Tier Classification:</span>
                <span className="text-[#F5D76E] uppercase font-mono text-[10px] font-semibold">
                  {selectedNode.type.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8E8F99]">Evidence source:</span>
                <ProvenanceBadge provenance={selectedNode.provenance} />
              </div>
              <p className="text-[10px] text-[#77736A] leading-relaxed">
                Simulated demo connections are labelled from seeded evidence. They are not verified live traffic.
              </p>

              <div className="flex items-center justify-between">
                <span className="text-[#8E8F99]">Risk Severity:</span>
                <SeverityBadge severity={selectedNode.riskBand === 'high' ? 'high' : selectedNode.riskBand === 'moderate' ? 'review' : 'info'} />
              </div>

              {/* Dynamic Metadata Attributes */}
              <div className="bg-[#141520] rounded-xl p-2.5 border border-white/5 space-y-1.5 mt-2">
                <span className="text-[10px] uppercase font-mono text-[#D4AF37] block">
                  Telemetry Metadata:
                </span>
                {Object.entries(selectedNode.details || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-[11px]">
                    <span className="text-[#71717A] capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="text-white font-mono text-right max-w-[150px] truncate">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button if this node is PocketCalc or another app */}
              {selectedNode.type === 'app' && (
                <button
                  onClick={() => {
                    if (onSelectAppOrigin) {
                      onSelectAppOrigin(selectedNode.sublabel || '');
                    }
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl gold-gradient-bg text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shadow-md"
                >
                  <span>Inspect Permissions in Scanner</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
