/**
 * Author Network Graph (D3.js Force-Directed Graph)
 * Shows collaboration relationships between authors
 */

import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { apiClient } from '../../services/api.client';
import { AuthorNetworkData, NetworkNode, NetworkEdge } from '../../types/api.types';

interface D3Node extends NetworkNode, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Edge extends NetworkEdge {
  source: string | D3Node;
  target: string | D3Node;
}

export function AuthorNetworkGraph() {
  const [data, setData] = useState<AuthorNetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [topN, setTopN] = useState(30); // Start with 30 authors for better visibility

  useEffect(() => {
    loadData();
  }, [topN]);

  useEffect(() => {
    if (data && svgRef.current) {
      renderGraph();
    }
  }, [data]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await apiClient.getAuthorNetwork(topN);
      setData(result);
    } catch (err) {
      setError('Failed to load author network');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = () => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = svgRef.current.clientWidth;
    const height = 500;

    // Create nodes and edges copies for D3
    const nodes: D3Node[] = data.nodes.map(n => ({ ...n }));
    const edges: D3Edge[] = data.edges.map(e => ({ ...e }));

    // Color scale by group
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Node size scale (based on paper count)
    const sizeScale = d3
      .scaleSqrt()
      .domain([0, d3.max(nodes, d => d.papers) || 10])
      .range([5, 20]);

    // Edge width scale (based on collaboration weight)
    const edgeWidthScale = d3
      .scaleLinear()
      .domain([0, d3.max(edges, d => d.weight) || 5])
      .range([1, 4]);

    // Create force simulation
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Edge>(edges)
          .id(d => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale((d as D3Node).papers) + 5));

    // Create container group with zoom capability
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create edges
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => edgeWidthScale(d.weight));

    // Create nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => sizeScale(d.papers))
      .attr('fill', d => colorScale(String(d.group || 0)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(
        d3
          .drag<SVGCircleElement, D3Node>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      );

    // Add labels
    const label = g
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('dx', d => sizeScale(d.papers) + 5)
      .attr('dy', '.35em')
      .text(d => d.name)
      .style('font-size', '11px')
      .style('fill', '#374151')
      .style('pointer-events', 'none');

    // Add tooltips
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'white')
      .style('border', '1px solid #e5e7eb')
      .style('border-radius', '8px')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.1)')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    node
      .on('mouseover', function (event, d) {
        tooltip
          .style('visibility', 'visible')
          .html(`<strong>${d.name}</strong><br/>Publications: ${d.papers}`);
        d3.select(this).attr('stroke', '#3b82f6').attr('stroke-width', 3);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', event.pageY - 10 + 'px')
          .style('left', event.pageX + 10 + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('visibility', 'hidden');
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
      });

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x || 0)
        .attr('y1', d => (d.source as D3Node).y || 0)
        .attr('x2', d => (d.target as D3Node).x || 0)
        .attr('y2', d => (d.target as D3Node).y || 0);

      node.attr('cx', d => d.x || 0).attr('cy', d => d.y || 0);

      label.attr('x', d => d.x || 0).attr('y', d => d.y || 0);
    });

    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragEnded(event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup on unmount
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  };

  if (loading) {
    return (
      <div className="card h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="text-gray-600 mt-4">Loading network graph...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card h-96 flex items-center justify-center">
        <p className="text-red-600">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Author Collaboration Network</h3>
          <p className="text-sm text-gray-600">
            Showing top {topN} authors • {data.statistics.totalCollaborations} collaborations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Show:</label>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value={20}>Top 20</option>
            <option value={30}>Top 30</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-2">
        <svg ref={svgRef} width="100%" height="500" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white' }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-2 bg-blue-50 rounded">
          <div className="font-bold text-blue-700">{data.statistics.totalAuthors}</div>
          <div className="text-gray-600">Authors</div>
        </div>
        <div className="p-2 bg-green-50 rounded">
          <div className="font-bold text-green-700">{data.statistics.totalCollaborations}</div>
          <div className="text-gray-600">Collaborations</div>
        </div>
        <div className="p-2 bg-purple-50 rounded">
          <div className="font-bold text-purple-700">
            {data.statistics.avgCollaborationsPerAuthor.toFixed(1)}
          </div>
          <div className="text-gray-600">Avg per Author</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <p>• Node size = publication count</p>
        <p>• Edge thickness = collaboration strength</p>
        <p>• Drag nodes to rearrange • Scroll to zoom</p>
      </div>
    </div>
  );
}
