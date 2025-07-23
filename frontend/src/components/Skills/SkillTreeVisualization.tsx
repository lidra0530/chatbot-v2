import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, Space, Button, Typography, Tag, Progress, Tooltip, Empty, Spin } from 'antd';
import { 
  ReloadOutlined, 
  FullscreenOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { SkillUtils, SkillConfig } from './index';

const { Text } = Typography;

// 技能节点接口定义
export interface SkillNode {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  isUnlocked: boolean;
  experience: number;
  experienceToNext: number;
  category: string;
  prerequisites: string[];
  children?: SkillNode[];
  isActive?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// 技能连接接口
interface SkillLink {
  source: SkillNode;
  target: SkillNode;
}

export interface SkillTreeVisualizationProps {
  skills: SkillNode[];
  loading?: boolean;
  height?: number;
  width?: number;
  theme?: 'light' | 'dark';
  onSkillClick?: (skill: SkillNode) => void;
  onSkillHover?: (skill: SkillNode | null) => void;
  selectedSkillId?: string;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  title?: string;
}

const SkillTreeVisualization: React.FC<SkillTreeVisualizationProps> = ({
  skills,
  loading = false,
  height = 600,
  width,
  theme = 'light',
  onSkillClick,
  onSkillHover,
  selectedSkillId,
  onRefresh,
  onFullscreen,
  title = '技能树'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
  const simulationRef = useRef<d3.Simulation<SkillNode, SkillLink> | null>(null);

  // 获取容器宽度
  const containerWidth = width || 800;

  // 准备数据：构建技能树的节点和连接
  const prepareSkillTreeData = useCallback((skillList: SkillNode[]) => {
    const nodes: SkillNode[] = [...skillList];
    const links: SkillLink[] = [];

    // 构建父子关系的连接
    skillList.forEach(skill => {
      skill.prerequisites.forEach(prereqId => {
        const prerequisite = skillList.find(s => s.id === prereqId);
        if (prerequisite) {
          links.push({
            source: prerequisite,
            target: skill
          });
        }
      });
    });

    return { nodes, links };
  }, []);

  // 获取技能节点的颜色
  const getSkillColor = useCallback((skill: SkillNode) => {
    const themeColors = SkillConfig.themes[theme];
    const status = SkillUtils.getSkillStatus(skill);
    
    if (selectedSkillId === skill.id) return themeColors.node.selected;
    
    switch (status) {
      case 'locked': return themeColors.node.locked;
      case 'active': return themeColors.node.active;
      case 'maxLevel': return themeColors.node.maxLevel;
      case 'unlocked': return themeColors.node.unlocked;
      default: return themeColors.node.locked;
    }
  }, [theme, selectedSkillId]);

  // 创建/更新D3可视化
  const updateVisualization = useCallback(() => {
    if (!svgRef.current || loading || skills.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { nodes, links } = prepareSkillTreeData(skills);

    // 清除之前的内容
    svg.selectAll('*').remove();

    // 设置缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        const { transform } = event;
        svg.select('g').attr('transform', transform);
      });

    svg.call(zoom);

    // 创建主容器组
    const container = svg.append('g');

    // 创建力导向仿真
    const simulation = d3.forceSimulation<SkillNode>(nodes)
      .force('link', d3.forceLink<SkillNode, SkillLink>(links)
        .id(d => d.id)
        .distance(SkillConfig.layout.linkDistance))
      .force('charge', d3.forceManyBody()
        .strength(SkillConfig.layout.forceStrength))
      .force('center', d3.forceCenter(containerWidth / 2, height / 2))
      .force('collision', d3.forceCollide(SkillConfig.layout.collisionRadius));

    simulationRef.current = simulation;

    // 创建连接线
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', SkillConfig.themes[theme].border)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // 创建技能节点组
    const nodeGroup = container.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'skill-node')
      .style('cursor', 'pointer');

    // 添加技能节点圆圈
    nodeGroup.append('circle')
      .attr('r', SkillConfig.layout.nodeRadius)
      .attr('fill', getSkillColor)
      .attr('stroke', SkillConfig.themes[theme].border)
      .attr('stroke-width', 2);

    // 添加技能等级文本
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', SkillConfig.themes[theme].text)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => d.isUnlocked ? d.level.toString() : '🔒');

    // 添加技能名称标签
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '3em')
      .attr('fill', SkillConfig.themes[theme].text)
      .attr('font-size', '10px')
      .text(d => d.name);

    // 添加进度指示器
    nodeGroup.filter(d => d.isUnlocked && d.level < d.maxLevel)
      .append('circle')
      .attr('r', SkillConfig.layout.nodeRadius + 4)
      .attr('fill', 'none')
      .attr('stroke', SkillConfig.themes[theme].progress)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', (d) => {
        const progress = SkillUtils.calculateProgress(d);
        const circumference = 2 * Math.PI * (SkillConfig.layout.nodeRadius + 4);
        const dashLength = (progress / 100) * circumference;
        return `${dashLength} ${circumference - dashLength}`;
      })
      .attr('stroke-dashoffset', 0)
      .attr('transform', `rotate(-90)`);

    // 节点交互事件
    nodeGroup
      .on('click', (_, d) => {
        setSelectedSkill(d);
        onSkillClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        // 悬停效果
        d3.select(event.currentTarget)
          .select('circle')
          .attr('fill', SkillConfig.themes[theme].node.hover);
        
        onSkillHover?.(d);
      })
      .on('mouseleave', (event, d) => {
        // 恢复原色
        d3.select(event.currentTarget)
          .select('circle')
          .attr('fill', getSkillColor(d));
        
        onSkillHover?.(null);
      });

    // 拖拽行为
    const drag = d3.drag<SVGGElement, SkillNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x || 0;
        d.fy = d.y || 0;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (endEvent, d) => {
        if (!endEvent.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SkillNode).x!)
        .attr('y1', d => (d.source as SkillNode).y!)
        .attr('x2', d => (d.target as SkillNode).x!)
        .attr('y2', d => (d.target as SkillNode).y!);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  }, [skills, loading, theme, containerWidth, height, getSkillColor, selectedSkillId, onSkillClick, onSkillHover, prepareSkillTreeData]);

  // 初始化和更新可视化
  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  // 缩放控制函数
  const handleZoomIn = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(
        d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.5
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(
        d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1 / 1.5
      );
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity
      );
    }
  };

  // 统计信息
  const stats = {
    totalSkills: skills.length,
    unlockedSkills: skills.filter(s => s.isUnlocked).length,
    maxLevelSkills: skills.filter(s => s.level >= s.maxLevel).length,
    totalExperience: SkillUtils.getTotalExperience(skills)
  };

  if (loading) {
    return (
      <Card title={title} style={{ height }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: height - 100 
        }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (skills.length === 0) {
    return (
      <Card title={title} style={{ height }}>
        <Empty description="暂无技能数据" />
      </Card>
    );
  }

  return (
    <Card
      title={title}
      style={{ height }}
      extra={
        <Space>
          <Button icon={<ZoomInOutlined />} size="small" onClick={handleZoomIn} type="text" />
          <Button icon={<ZoomOutOutlined />} size="small" onClick={handleZoomOut} type="text" />
          <Button icon={<CompressOutlined />} size="small" onClick={handleResetZoom} type="text" />
          {onRefresh && (
            <Button icon={<ReloadOutlined />} size="small" onClick={onRefresh} type="text" />
          )}
          {onFullscreen && (
            <Button icon={<FullscreenOutlined />} size="small" onClick={onFullscreen} type="text" />
          )}
        </Space>
      }
    >
      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width={containerWidth}
          height={height - 150}
          style={{
            border: '1px solid #f0f0f0',
            borderRadius: '8px'
          }}
        />
        
        {/* 统计信息面板 */}
        <div style={{ 
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Space>
            <Tag color="blue">总技能: {stats.totalSkills}</Tag>
            <Tag color="green">已解锁: {stats.unlockedSkills}</Tag>
            <Tag color="gold">满级: {stats.maxLevelSkills}</Tag>
            <Tag color="purple">总经验: {SkillUtils.formatExperience(stats.totalExperience)}</Tag>
          </Space>
          
          {selectedSkill && (
            <Space>
              <Text strong>{selectedSkill.name}</Text>
              <Text type="secondary">Lv.{selectedSkill.level}/{selectedSkill.maxLevel}</Text>
              {selectedSkill.isUnlocked && selectedSkill.level < selectedSkill.maxLevel && (
                <Tooltip title={`${selectedSkill.experience}/${selectedSkill.experienceToNext} 经验`}>
                  <Progress 
                    percent={SkillUtils.calculateProgress(selectedSkill)} 
                    size="small" 
                    style={{ width: 100 }} 
                  />
                </Tooltip>
              )}
            </Space>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SkillTreeVisualization;