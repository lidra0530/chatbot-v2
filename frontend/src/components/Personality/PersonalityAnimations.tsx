import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * 个性数据实时更新动画组件
 * 使用D3.js实现流畅的数据过渡动画效果
 */

interface AnimatedValue {
  trait: string;
  current: number;
  target: number;
  previous: number;
}

interface PersonalityAnimationsProps {
  /** 个性特征数据 */
  traits: Record<string, number>;
  /** 动画持续时间(毫秒) */
  duration?: number;
  /** 动画缓动函数 */
  easing?: string;
  /** 是否启用粒子效果 */
  enableParticles?: boolean;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 自定义样式类名 */
  className?: string;
  /** 数据变化回调 */
  onAnimationComplete?: (trait: string, value: number) => void;
}

const PersonalityAnimations: React.FC<PersonalityAnimationsProps> = ({
  traits,
  duration = 1500,
  easing = 'cubic-in-out',
  enableParticles = true,
  theme = 'light',
  className,
  onAnimationComplete
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animatedValues, setAnimatedValues] = useState<AnimatedValue[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // 特征配置
  const traitConfig = {
    happiness: { name: '快乐度', color: '#52c41a', icon: '😊' },
    energy: { name: '活力值', color: '#faad14', icon: '⚡' },
    curiosity: { name: '好奇心', color: '#13c2c2', icon: '🤔' },
    sociability: { name: '社交性', color: '#1890ff', icon: '👥' },
    creativity: { name: '创造力', color: '#722ed1', icon: '🎨' },
    empathy: { name: '同理心', color: '#eb2f96', icon: '❤️' },
    independence: { name: '独立性', color: '#fa8c16', icon: '🦅' },
    playfulness: { name: '玩耍性', color: '#a0d911', icon: '🎮' }
  };

  // 初始化和更新动画值
  useEffect(() => {
    const newAnimatedValues = Object.entries(traits).map(([trait, value]) => {
      const existingValue = animatedValues.find(v => v.trait === trait);
      return {
        trait,
        current: existingValue ? existingValue.current : value,
        target: value,
        previous: existingValue ? existingValue.current : value
      };
    });

    setAnimatedValues(newAnimatedValues);
  }, [traits]);

  // D3动画实现
  useEffect(() => {
    if (!svgRef.current || animatedValues.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    // 清空SVG
    svg.selectAll('*').remove();

    // 设置尺寸
    svg.attr('width', width).attr('height', height);

    // 创建比例尺
    const xScale = d3.scaleBand()
      .domain(animatedValues.map(d => d.trait))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // 创建渐变定义
    const defs = svg.append('defs');
    
    animatedValues.forEach(({ trait }) => {
      const config = traitConfig[trait as keyof typeof traitConfig];
      if (!config) return;

      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${trait}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', height)
        .attr('x2', 0).attr('y2', 0);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', config.color)
        .attr('stop-opacity', 0.3);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', config.color)
        .attr('stop-opacity', 0.8);
    });

    // 创建柱状图
    const bars = svg.selectAll('.bar')
      .data(animatedValues)
      .enter()
      .append('g')
      .attr('class', 'bar');

    // 柱体
    bars.append('rect')
      .attr('x', d => xScale(d.trait)!)
      .attr('y', height - margin.bottom)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => {
        const config = traitConfig[d.trait as keyof typeof traitConfig];
        return config ? `url(#gradient-${d.trait})` : '#1890ff';
      })
      .attr('stroke', d => {
        const config = traitConfig[d.trait as keyof typeof traitConfig];
        return config ? config.color : '#1890ff';
      })
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('y', d => yScale(d.target))
      .attr('height', d => yScale(0) - yScale(d.target))
      .on('end', function(event, d) {
        // 动画完成回调
        if (onAnimationComplete) {
          onAnimationComplete(d.trait, d.target);
        }
        
        // 添加发光效果
        if (Math.abs(d.target - d.previous) > 5) {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('filter', 'drop-shadow(0 0 8px currentColor)')
            .transition()
            .duration(300)
            .attr('filter', 'none');
        }
      });

    // 数值标签
    bars.append('text')
      .attr('x', d => xScale(d.trait)! + xScale.bandwidth() / 2)
      .attr('y', height - margin.bottom + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', theme === 'dark' ? '#ffffff' : '#333333')
      .text('0')
      .transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .textTween(function(d) {
        const i = d3.interpolate(d.previous, d.target);
        return function(t) {
          return Math.round(i(t)).toString();
        };
      })
      .attr('y', d => yScale(d.target) - 10);

    // 特征名称标签
    bars.append('text')
      .attr('x', d => xScale(d.trait)! + xScale.bandwidth() / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', theme === 'dark' ? '#cccccc' : '#666666')
      .text(d => {
        const config = traitConfig[d.trait as keyof typeof traitConfig];
        return config ? config.name : d.trait;
      });

    // 粒子效果
    if (enableParticles) {
      animatedValues.forEach(({ trait, target, previous }) => {
        if (Math.abs(target - previous) > 10) {
          createParticleEffect(svg, xScale(trait)! + xScale.bandwidth() / 2, yScale(target), trait);
        }
      });
    }

    // Y轴
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d}`);

    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll('text')
      .attr('fill', theme === 'dark' ? '#ffffff' : '#333333');

    svg.selectAll('.domain, .tick line')
      .attr('stroke', theme === 'dark' ? '#404040' : '#d9d9d9');

  }, [animatedValues, duration, theme, enableParticles, onAnimationComplete]);

  // 创建粒子效果
  const createParticleEffect = (svg: any, x: number, y: number, trait: string) => {
    const config = traitConfig[trait as keyof typeof traitConfig];
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = svg.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 2)
        .attr('fill', config ? config.color : '#1890ff')
        .attr('opacity', 0.8);

      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 30;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      particle
        .transition()
        .duration(800)
        .ease(d3.easeQuadOut)
        .attr('cx', targetX)
        .attr('cy', targetY)
        .attr('r', 0)
        .attr('opacity', 0)
        .remove();
    }
  };

  // 波纹效果组件
  const RippleEffect = ({ x, y, color }: { x: number; y: number; color: string }) => {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    useEffect(() => {
      const id = Date.now();
      setRipples(prev => [...prev, { id, x, y }]);
      
      const timer = setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 1000);

      return () => clearTimeout(timer);
    }, [x, y]);

    return (
      <>
        {ripples.map(ripple => (
          <circle
            key={ripple.id}
            cx={ripple.x}
            cy={ripple.y}
            r="0"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.6"
          >
            <animate
              attributeName="r"
              values="0;20;40"
              dur="1s"
              begin="0s"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.3;0"
              dur="1s"
              begin="0s"
            />
          </circle>
        ))}
      </>
    );
  };

  return (
    <div className={`personality-animations ${className || ''}`}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '300px',
          backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`
        }}
      />
      
      {/* 变化指示器 */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center'
      }}>
        {animatedValues.map(({ trait, target, previous }) => {
          const config = traitConfig[trait as keyof typeof traitConfig];
          const change = target - previous;
          
          if (Math.abs(change) < 1) return null;

          return (
            <div
              key={trait}
              style={{
                padding: '4px 8px',
                backgroundColor: change > 0 ? '#f6ffed' : '#fff2e8',
                border: `1px solid ${change > 0 ? '#b7eb8f' : '#ffbb96'}`,
                borderRadius: '12px',
                fontSize: '12px',
                color: change > 0 ? '#52c41a' : '#fa8c16',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{config?.icon || '📊'}</span>
              <span>{config?.name || trait}</span>
              <span>{change > 0 ? '+' : ''}{change.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {/* 动画状态指示器 */}
      {isAnimating && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '4px 8px',
          backgroundColor: '#1890ff',
          color: '#ffffff',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          更新中...
        </div>
      )}
    </div>
  );
};

export default PersonalityAnimations;