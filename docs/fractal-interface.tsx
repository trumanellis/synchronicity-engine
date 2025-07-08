import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const getNodeColors = (type) => {
  switch(type) {
    case 'temple':
      return { base: 'bg-purple-500 hover:bg-purple-600', text: 'text-white' };
    case 'member':
      return { base: 'bg-teal-500 hover:bg-teal-600', text: 'text-white' };
    case 'dharma':
      return { base: 'bg-amber-500 hover:bg-amber-600', text: 'text-white' };
    case 'commons':
      return { base: 'bg-slate-500 hover:bg-slate-600', text: 'text-white' };
    default:
      return { base: 'bg-gray-500 hover:bg-gray-600', text: 'text-white' };
  }
};

const sampleNodes = {
  "member-1": {
    id: "member-1",
    type: "member",
    name: "Truman",
    aliases: ["Tech Architect", "Wisdom Bridge"],
    description: `Truman emerged as a bridge between ancient wisdom and modern technology through a profound journey that began in the tech hubs of the Pacific Northwest. With a background in distributed systems and a deep connection to indigenous knowledge systems, he uniquely combines technical expertise with spiritual understanding. His work focuses on creating technological frameworks that honor both innovation and tradition.

As the lead architect of the Synchronicity Engine, Truman brings together his expertise in OrbitDB/IPFS development, React, and distributed systems with his understanding of sacred economies and regenerative practices. His approach to software development is grounded in the belief that technology must serve as a tool for spiritual evolution and ecological regeneration.`,
    gratitude: 2000,
    sourceId: null,
    childNodes: ["mvp-1", "mvp-2", "mvp-3", "mvp-4", "mvp-5"]
  },
  "mvp-1": {
    id: "mvp-1",
    type: "dharma",
    name: "Core Databases",
    aliases: ["Sacred Repositories", "Data Architecture"],
    description: "Design and implement the fundamental OrbitDB databases that form the backbone of the Synchronicity Engine.",
    gratitude: 800,
    sourceId: "member-1",
    childNodes: ["mvp-1a", "mvp-1b", "mvp-1c"]
  },
  "mvp-1a": {
    id: "mvp-1a",
    type: "dharma",
    name: "Identity Store",
    aliases: ["Sacred Identity"],
    description: "Implement user profiles with proof of humanness validation using OrbitDB docstore",
    gratitude: 300,
    sourceId: "mvp-1",
    childNodes: []
  },
  "mvp-1b": {
    id: "mvp-1b",
    type: "dharma",
    name: "Task Store",
    aliases: ["Action Vessel"],
    description: "Create the dharma task management system using OrbitDB eventstore",
    gratitude: 250,
    sourceId: "mvp-1",
    childNodes: []
  },
  "mvp-1c": {
    id: "mvp-1c",
    type: "dharma",
    name: "Gratitude Store",
    aliases: ["Value Flow"],
    description: "Build the token creation and transfer system using OrbitDB counterstore",
    gratitude: 250,
    sourceId: "mvp-1",
    childNodes: []
  },
  "mvp-2": {
    id: "mvp-2",
    type: "dharma",
    name: "Frontend Core",
    aliases: ["Sacred Interface", "User Experience"],
    description: "Develop the core React components and state management for the user interface.",
    gratitude: 700,
    sourceId: "member-1",
    childNodes: ["mvp-2a", "mvp-2b", "mvp-2c"]
  },
  "mvp-2a": {
    id: "mvp-2a",
    type: "dharma",
    name: "Base Components",
    aliases: ["UI Elements"],
    description: "Create reusable React components",
    gratitude: 250,
    sourceId: "mvp-2",
    childNodes: []
  },
  "mvp-2b": {
    id: "mvp-2b",
    type: "dharma",
    name: "State Logic",
    aliases: ["Flow Control"],
    description: "Implement global state management",
    gratitude: 200,
    sourceId: "mvp-2",
    childNodes: []
  },
  "mvp-2c": {
    id: "mvp-2c",
    type: "dharma",
    name: "OrbitDB Integration",
    aliases: ["Sacred Bridge"],
    description: "Connect frontend with OrbitDB and IPFS infrastructure",
    gratitude: 250,
    sourceId: "mvp-2",
    childNodes: []
  },
  "mvp-3": {
    id: "mvp-3",
    type: "dharma",
    name: "Attention System",
    aliases: ["Sacred Focus", "Value Tracking"],
    description: "Build the attention tracking and gratitude calculation system.",
    gratitude: 600,
    sourceId: "member-1",
    childNodes: ["mvp-3a", "mvp-3b", "mvp-3c"]
  },
  "mvp-3a": {
    id: "mvp-3a",
    type: "dharma",
    name: "Event Capture",
    aliases: ["Focus Tracking"],
    description: "Implement attention event logging",
    gratitude: 200,
    sourceId: "mvp-3",
    childNodes: []
  },
  "mvp-3b": {
    id: "mvp-3b",
    type: "dharma",
    name: "Analytics",
    aliases: ["Value Metrics"],
    description: "Create attention analytics system",
    gratitude: 200,
    sourceId: "mvp-3",
    childNodes: []
  },
  "mvp-3c": {
    id: "mvp-3c",
    type: "dharma",
    name: "Token Generation",
    aliases: ["Reward Flow"],
    description: "Convert attention into gratitude tokens using OrbitDB feed store",
    gratitude: 200,
    sourceId: "mvp-3",
    childNodes: []
  },
  "mvp-4": {
    id: "mvp-4",
    type: "dharma",
    name: "Temple System",
    aliases: ["Sacred Spaces", "Community Hub"],
    description: "Implement the Temple management system for organizing communities and resources.",
    gratitude: 750,
    sourceId: "member-1",
    childNodes: ["mvp-4a", "mvp-4b", "mvp-4c", "mvp-4d"]
  },
  "mvp-4a": {
    id: "mvp-4a",
    type: "dharma",
    name: "Temple Creation",
    aliases: ["Sacred Genesis"],
    description: "Build temple creation and setup flow",
    gratitude: 200,
    sourceId: "mvp-4",
    childNodes: []
  },
  "mvp-4b": {
    id: "mvp-4b",
    type: "dharma",
    name: "Membership",
    aliases: ["Community Bonds"],
    description: "Implement member management system",
    gratitude: 200,
    sourceId: "mvp-4",
    childNodes: []
  },
  "mvp-4c": {
    id: "mvp-4c",
    type: "dharma",
    name: "Resource Pool",
    aliases: ["Sacred Commons"],
    description: "Create shared resource management using OrbitDB key-value store",
    gratitude: 200,
    sourceId: "mvp-4",
    childNodes: []
  },
  "mvp-4d": {
    id: "mvp-4d",
    type: "dharma",
    name: "P2P Networking",
    aliases: ["Sacred Web"],
    description: "Implement OrbitDB pub/sub for inter-temple communication",
    gratitude: 150,
    sourceId: "mvp-4",
    childNodes: []
  },
  "mvp-5": {
    id: "mvp-5",
    type: "dharma",
    name: "Security & Testing",
    aliases: ["Sacred Protection", "Quality Assurance"],
    description: "Ensure system security and reliability through comprehensive testing and validation.",
    gratitude: 650,
    sourceId: "member-1",
    childNodes: ["mvp-5a", "mvp-5b", "mvp-5c"]
  },
  "mvp-5a": {
    id: "mvp-5a",
    type: "dharma",
    name: "Security Audit",
    aliases: ["Sacred Guard"],
    description: "Conduct security review of OrbitDB access control and IPFS implementation",
    gratitude: 250,
    sourceId: "mvp-5",
    childNodes: []
  },
  "mvp-5b": {
    id: "mvp-5b",
    type: "dharma",
    name: "Test Suite",
    aliases: ["Truth Validation"],
    description: "Create comprehensive test coverage",
    gratitude: 200,
    sourceId: "mvp-5",
    childNodes: []
  },
  "mvp-5c": {
    id: "mvp-5c",
    type: "dharma",
    name: "Performance",
    aliases: ["Sacred Flow"],
    description: "Optimize system performance and scaling",
    gratitude: 200,
    sourceId: "mvp-5",
    childNodes: []
  }
};

const formatGratitude = (minutes) => {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = minutes % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  
  return parts.join(' ') || '0m';
};

const NodeDetails = ({ node }) => {
  const colors = getNodeColors(node.type);
  return (
    <div className="p-6 border-b">
      <div className="flex items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-32 h-32 rounded-full ${colors.base} flex items-center justify-center ${colors.text} text-2xl`}>
            {node.name.charAt(0)}
          </div>
          <div className="text-xs text-gray-500">
            ID: {node.id}
          </div>
          <div className="text-xs text-gray-500">
            Gratitude: {formatGratitude(node.gratitude)}
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{node.name}</h2>
          <div className="text-gray-600 mt-1">{node.aliases.join(", ")}</div>
          <div className="mt-4 text-sm whitespace-pre-line">{node.description}</div>
        </div>
      </div>
    </div>
  );
};

const NodeNavigator = ({ node, sourceNode, childNodes, onNavigate }) => {
  const getParentSiblings = () => {
    if (!sourceNode?.sourceId) return [];
    const grandparent = sampleNodes[sourceNode.sourceId];
    return grandparent.childNodes
      .map(id => sampleNodes[id])
      .filter(sibling => sibling.id !== sourceNode.id)
      .sort((a, b) => b.gratitude - a.gratitude);
  };

  const parentSiblings = getParentSiblings();

  const SiblingCircles = ({ siblings }) => (
    <div className="flex flex-col gap-2">
      {siblings.map(sibling => {
        const colors = getNodeColors(sibling.type);
        return (
          <div
            key={sibling.id}
            onClick={() => onNavigate(sibling.id)}
            className={`w-16 h-16 ${colors.base} rounded-full flex flex-col items-center justify-center ${colors.text} cursor-pointer p-1`}
          >
            <span className="text-xs text-center font-bold">{sibling.name}</span>
            <span className="text-xs">{formatGratitude(sibling.gratitude)}</span>
          </div>
        );
      })}
    </div>
  );

  const sourceColors = sourceNode ? getNodeColors(sourceNode.type) : {};
  const currentColors = getNodeColors(node.type);

  return (
            <div className="relative h-1/2 flex items-start pt-4 justify-center border-t">
      {sourceNode && (
        <div className="absolute top-0 left-0">
          <div 
            onClick={() => onNavigate(sourceNode.id)}
            className={`w-24 h-24 ${sourceColors.base} rounded-full flex flex-col items-center justify-center cursor-pointer`}
          >
            <span className={`${sourceColors.text} text-sm font-bold`}>{sourceNode.name}</span>
            <span className={`${sourceColors.text} text-xs`}>{formatGratitude(sourceNode.gratitude)}</span>
          </div>
          <div className="mt-4 max-h-48 overflow-y-auto">
            <SiblingCircles siblings={parentSiblings} />
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center relative">
        <div className={`w-32 h-32 ${currentColors.base} rounded-full flex flex-col items-center justify-center ${currentColors.text} cursor-pointer p-2`}>
          <span className="text-lg font-bold text-center leading-tight">{node.name}</span>
          <span className="text-sm">{formatGratitude(node.gratitude)}</span>
        </div>
        <button className="absolute -top-8 -right-8 w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center hover:border-gray-400 bg-white gap-1">
          <Plus className="w-6 h-6 text-gray-400" />
          <span className="text-xs text-gray-500">Create Node</span>
        </button>
        {sourceNode && (
          <div className="mt-4 max-h-48 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {sampleNodes[sourceNode.id].childNodes
                .map(id => sampleNodes[id])
                .filter(sibling => sibling.id !== node.id)
                .sort((a, b) => b.gratitude - a.gratitude)
                .map(sibling => {
                  const colors = getNodeColors(sibling.type);
                  return (
                    <div
                      key={sibling.id}
                      onClick={() => onNavigate(sibling.id)}
                      className={`w-20 h-20 ${colors.base} rounded-full flex flex-col items-center justify-center ${colors.text} cursor-pointer p-1`}
                    >
                      <span className="text-xs text-center font-bold leading-tight">{sibling.name}</span>
                      <span className="text-xs">{formatGratitude(sibling.gratitude)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute right-0 top-0 bottom-0 w-48 flex flex-col gap-4 p-4 max-h-96 overflow-y-auto">
        {childNodes.map(childNode => {
          const colors = getNodeColors(childNode.type);
          return (
            <div
              key={childNode.id}
              onClick={() => onNavigate(childNode.id)}
              className={`w-20 h-20 flex-shrink-0 ${colors.base} rounded-full flex flex-col items-center justify-center ${colors.text} cursor-pointer p-2`}
            >
              <span className="text-xs text-center font-bold leading-none">{childNode.name}</span>
              <span className="text-[10px]">{formatGratitude(childNode.gratitude)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FractalInterface = () => {
  const [currentNodeId, setCurrentNodeId] = useState("member-1");
  const currentNode = sampleNodes[currentNodeId];
  const sourceNode = currentNode?.sourceId ? sampleNodes[currentNode.sourceId] : null;
  const childNodes = (currentNode?.childNodes || [])
    .map(id => sampleNodes[id])
    .filter(Boolean);

  if (!currentNode) return <div>Node not found</div>;

  return (
    <Card className="w-full max-w-4xl mx-auto h-screen flex flex-col">
      <div className="h-1/2 overflow-y-auto">
        <NodeDetails node={currentNode} />
      </div>
      <NodeNavigator
        node={currentNode}
        sourceNode={sourceNode}
        childNodes={childNodes}
        onNavigate={setCurrentNodeId}
      />
    </Card>
  );
};

export default FractalInterface;