import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';

export interface SkillNode {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  experience: number;
  experienceToNext: number;
  isUnlocked: boolean;
  isActive: boolean;
  category: string;
  description: string;
  prerequisites: string[];
  children?: SkillNode[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SkillTreeVisualizationProps {
  petId: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  enableZoom?: boolean;
  enablePan?: boolean;
  enableTooltips?: boolean;
  onNodeClick?: (node: SkillNode) => void;
  onNodeHover?: (node: SkillNode | null) => void;
  className?: string;
}

export const SkillTreeVisualization: React.FC<SkillTreeVisualizationProps> = ({
  petId,
  width = 800,
  height = 600,
  theme = 'light',
  enableZoom = true,
  enablePan = true,
  enableTooltips = true,
  onNodeClick,
  onNodeHover,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  
  // const dispatch = useDispatch<AppDispatch>(); // TODO: Enable when Redux actions are implemented
  const { data: skills, isLoading, error } = useSelector((state: RootState) => state.skills);
  
  // Transform skills data to tree structure
  const skillTree = React.useMemo(() => {
    if (!skills[petId]) return null;
    
    const skillsArray = skills[petId];
    const skillMap = new Map<string, SkillNode>();
    
    // Create skill nodes
    skillsArray.forEach((skill: any) => {
      skillMap.set(skill.id, {
        ...skill,
        children: [],
      });
    });
    
    // Build tree structure
    const rootNodes: SkillNode[] = [];
    skillsArray.forEach((skill: any) => {
      const node = skillMap.get(skill.id)!;
      
      if (skill.prerequisites.length === 0) {
        rootNodes.push(node);
      } else {
        skill.prerequisites.forEach((prereqId: string) => {
          const parent = skillMap.get(prereqId);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
          }
        });
      }
    });
    
    return rootNodes;
  }, [skills, petId]);

  // Color schemes for themes
  const colors = React.useMemo(() => {
    const base = {
      light: {
        background: '#ffffff',
        node: {
          unlocked: '#4CAF50',
          locked: '#E0E0E0',
          active: '#2196F3',
          maxLevel: '#FF9800',
        },
        link: '#CCCCCC',
        text: '#333333',
        tooltip: '#000000',
      },
      dark: {
        background: '#1a1a1a',
        node: {
          unlocked: '#66BB6A',
          locked: '#424242',
          active: '#42A5F5',
          maxLevel: '#FFB74D',
        },
        link: '#666666',
        text: '#FFFFFF',
        tooltip: '#FFFFFF',
      },
    };
    return base[theme];
  }, [theme]);

  // Initialize and update visualization
  useEffect(() => {
    if (!skillTree || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create main group for zoom/pan
    const g = svg.append('g').attr('class', 'main-group');
    
    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    if (enableZoom || enablePan) {
      svg.call(zoom);
    }
    
    // Flatten tree for force simulation
    const nodes: SkillNode[] = [];
    const links: { source: SkillNode; target: SkillNode }[] = [];
    
    const traverse = (nodeList: SkillNode[], parentNode?: SkillNode) => {
      nodeList.forEach(node => {
        nodes.push(node);
        
        if (parentNode) {
          links.push({ source: parentNode, target: node });
        }
        
        if (node.children && node.children.length > 0) {
          traverse(node.children, node);
        }
      });
    };
    
    traverse(skillTree);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', colors.link)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7);
    
    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SkillNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x ?? null;
          d.fy = d.y ?? null;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );
    
    // Add node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d) => {
        if (!d.isUnlocked) return colors.node.locked;
        if (d.isActive) return colors.node.active;
        if (d.level === d.maxLevel) return colors.node.maxLevel;
        return colors.node.unlocked;
      })
      .attr('stroke', colors.text)
      .attr('stroke-width', 2)
      .attr('opacity', (d) => d.isUnlocked ? 1 : 0.5);
    
    // Add progress arcs for unlocked skills
    node.filter(d => d.isUnlocked && d.level < d.maxLevel)
      .append('path')
      .attr('class', 'progress-arc')
      .attr('d', (d) => {
        const progress = d.experience / (d.experience + d.experienceToNext);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (2 * Math.PI * progress);
        
        const arc = d3.arc()
          .innerRadius(22)
          .outerRadius(25)
          .startAngle(startAngle)
          .endAngle(endAngle);
        
        return arc(null as any);
      })
      .attr('fill', colors.node.active)
      .attr('opacity', 0.8);
    
    // Add node labels
    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text((d) => d.level > 0 ? d.level.toString() : '');
    
    // Add skill names below nodes
    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '8px')
      .text((d) => d.name);
    
    // Event handlers
    node
      .on('click', (event, d) => {
        if (onNodeClick) {
          onNodeClick(d);
        }
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        if (onNodeHover) {
          onNodeHover(d);
        }
        
        if (enableTooltips && tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        if (onNodeHover) {
          onNodeHover(null);
        }
        
        if (enableTooltips && tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 0);
        }
      })
      .on('mousemove', () => {
        if (enableTooltips && tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      });
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SkillNode).x!)
        .attr('y1', (d) => (d.source as SkillNode).y!)
        .attr('x2', (d) => (d.target as SkillNode).x!)
        .attr('y2', (d) => (d.target as SkillNode).y!);
      
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
    
    // Reset zoom
    const resetZoom = () => {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
      );
    };
    
    // Add reset button
    svg.append('text')
      .attr('x', width - 60)
      .attr('y', 20)
      .attr('fill', colors.text)
      .attr('font-size', '12px')
      .attr('cursor', 'pointer')
      .text('Reset Zoom')
      .on('click', resetZoom);
    
    return () => {
      simulation.stop();
    };
  }, [skillTree, width, height, colors, enableZoom, enablePan, enableTooltips, onNodeClick, onNodeHover]);

  // Load skills data - placeholder for future implementation
  useEffect(() => {
    if (petId) {
      // TODO: dispatch(fetchPetSkills(petId));
      console.log('Loading skills for pet:', petId);
    }
  }, [petId]);

  // Handle skill level up - placeholder for future implementation
  // const handleSkillLevelUp = useCallback((skillId: string) => {
  //   if (petId) {
  //     // TODO: dispatch(updateSkill({ petId, skillId, action: 'levelUp' }));
  //     console.log('Level up skill:', skillId, 'for pet:', petId);
  //   }
  // }, [petId]);

  if (isLoading) {
    return (
      <div className={`skill-tree-loading ${className || ''}`} style={{ 
        width, 
        height, 
        backgroundColor: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text,
      }}>
        Loading skill tree...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`skill-tree-error ${className || ''}`} style={{ 
        width, 
        height, 
        backgroundColor: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f44336',
      }}>
        Error loading skill tree: {error}
      </div>
    );
  }

  return (
    <div className={`skill-tree-visualization ${className || ''}`} style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ backgroundColor: colors.background }}
      />
      
      {enableTooltips && (
        <div
          ref={tooltipRef}
          className="skill-tooltip"
          style={{
            position: 'absolute',
            background: theme === 'dark' ? '#333' : '#fff',
            border: `1px solid ${theme === 'dark' ? '#666' : '#ccc'}`,
            borderRadius: '4px',
            padding: '8px',
            fontSize: '12px',
            color: colors.tooltip,
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.2s',
            maxWidth: '200px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {hoveredNode && (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {hoveredNode.name}
              </div>
              <div style={{ marginBottom: '2px' }}>
                Level: {hoveredNode.level}/{hoveredNode.maxLevel}
              </div>
              <div style={{ marginBottom: '2px' }}>
                Category: {hoveredNode.category}
              </div>
              {hoveredNode.isUnlocked && hoveredNode.level < hoveredNode.maxLevel && (
                <div style={{ marginBottom: '2px' }}>
                  Progress: {hoveredNode.experience}/{hoveredNode.experience + hoveredNode.experienceToNext}
                </div>
              )}
              <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.8 }}>
                {hoveredNode.description}
              </div>
              {!hoveredNode.isUnlocked && hoveredNode.prerequisites.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '10px', color: '#f44336' }}>
                  Requires: {hoveredNode.prerequisites.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillTreeVisualization;