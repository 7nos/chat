import React from 'react';
import Tree from 'react-d3-tree';
import '../styles/MindMap.css';

const MindMap = ({ data, type }) => {
  const getTreeProps = () => {
    const baseProps = {
      data: data,
      orientation: 'vertical',
      pathFunc: 'step',
      separation: { siblings: 1.5, nonSiblings: 2.5 },
      translate: { x: window.innerWidth / 2, y: window.innerHeight / 4 },
      nodeSize: { x: 200, y: 100 },
      renderCustomNodeElement: ({ nodeDatum, toggleNode }) => (
        <g>
          <circle
            r={15}
            onClick={toggleNode}
            fill={nodeDatum.children ? '#4a90e2' : '#82c91e'}
          />
          <text
            dy=".31em"
            x={nodeDatum.children ? -40 : 40}
            textAnchor={nodeDatum.children ? 'end' : 'start'}
            style={{ fill: '#fff', fontSize: '12px' }}
          >
            {nodeDatum.name}
          </text>
        </g>
      ),
    };

    switch (type) {
      case 'radial':
        return {
          ...baseProps,
          orientation: 'radial',
          pathFunc: 'diagonal',
        };
      case 'hierarchical':
        return {
          ...baseProps,
          orientation: 'vertical',
          pathFunc: 'step',
          separation: { siblings: 2, nonSiblings: 3 },
        };
      case 'organic':
        return {
          ...baseProps,
          orientation: 'vertical',
          pathFunc: 'diagonal',
          separation: { siblings: 2, nonSiblings: 2.5 },
        };
      default: // tree
        return baseProps;
    }
  };

  if (!data) {
    return (
      <div className="mindmap-container">
        <div className="no-data-message">No mind map data available</div>
      </div>
    );
  }

  return (
    <div className="mindmap-container">
      <Tree {...getTreeProps()} />
    </div>
  );
};

export default MindMap; 