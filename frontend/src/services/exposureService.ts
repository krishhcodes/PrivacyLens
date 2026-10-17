import type { ExposureGraphData } from '../types';
import { MOCK_EXPOSURE_GRAPH } from '../data/mockExposure';

export function getExposureGraph(filterType?: string, searchQuery?: string): ExposureGraphData {
  let nodes = [...MOCK_EXPOSURE_GRAPH.nodes];
  let links = [...MOCK_EXPOSURE_GRAPH.links];

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const matchingNodeIds = new Set(
      nodes
        .filter(n => n.label.toLowerCase().includes(q) || (n.sublabel && n.sublabel.toLowerCase().includes(q)))
        .map(n => n.id)
    );

    // Keep identity node always
    matchingNodeIds.add("node-identity");

    // Also include immediately connected neighbors
    links.forEach(l => {
      if (matchingNodeIds.has(l.source)) matchingNodeIds.add(l.target);
      if (matchingNodeIds.has(l.target)) matchingNodeIds.add(l.source);
    });

    nodes = nodes.filter(n => matchingNodeIds.has(n.id));
    links = links.filter(l => matchingNodeIds.has(l.source) && matchingNodeIds.has(l.target));
  }

  if (filterType && filterType !== 'all') {
    if (filterType === 'apps_only') {
      const allowed = new Set(["identity", "app"]);
      nodes = nodes.filter(n => allowed.has(n.type));
      const validIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => validIds.has(l.source) && validIds.has(l.target));
    } else if (filterType === 'trackers_only') {
      const allowed = new Set(["identity", "app", "third_party"]);
      nodes = nodes.filter(n => allowed.has(n.type));
      const validIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => validIds.has(l.source) && validIds.has(l.target));
    } else if (filterType === 'sensors_only') {
      const allowed = new Set(["identity", "app", "permission", "data_type"]);
      nodes = nodes.filter(n => allowed.has(n.type));
      const validIds = new Set(nodes.map(n => n.id));
      links = links.filter(l => validIds.has(l.source) && validIds.has(l.target));
    }
  }

  return { nodes, links };
}
