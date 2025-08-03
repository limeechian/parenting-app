import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Brain, MessageCircle, Sparkles, Clock, User, Baby, Heart, Lightbulb,
  Plus, ChevronDown, ChevronRight, Trash2, Edit3, Search, X, Shield, Users, Settings, MessageSquare, Menu, X as CloseIcon
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  agent?: string;
  confidence?: number;
  references?: string[];
}

interface ChatConversation {
  id: string;
  title: string;
  childId?: string;
  childName?: string;
  lastMessage: string;
  lastUpdated: string;
  participatingAgents?: string[];
  conversationType?: string;
  primaryAgentType?: string;
  enabledAgents?: string[];
  messages: Message[];
}

interface Child {
  id: string;
  name: string;
  age: number;
  gender: string;
}

interface Agent {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  specialties: string[];
  active: boolean;
  confidence: number;
  description: string;
  exampleQuestions: string[];
  lastActive?: Date;
}

interface ConfirmationDialog {
  isOpen: boolean;
  type: 'mode' | 'agent';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

//const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'http://parenting-app-alb-1579687963.ap-southeast-2.elb.amazonaws.com';
//const API_BASE_URL = 'https://2fayughxfh.execute-api.ap-southeast-2.amazonaws.com/prod';
const AIChat: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoMode, setAutoMode] = useState(true);
  const [enabledAgents, setEnabledAgents] = useState<string[]>(['parenting-style', 'child-development', 'crisis-intervention', 'community-connector']);
  const [mobileView, setMobileView] = useState<'chat' | 'history' | 'agents'>('chat');
  const [selectedChild, setSelectedChild] = useState<string>('general');
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Conversation state tracking for changes
  const [originalConversationState, setOriginalConversationState] = useState<{
    autoMode: boolean;
    enabledAgents: string[];
  } | null>(null);
  
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog>({
    isOpen: false,
    type: 'mode',
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
    onCancel: () => {}
  });
  
  // Sidebar states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const isLandingPage = !currentConversation || (currentConversation && currentConversation.messages.length === 0);
  const isGeneralChat = currentConversation && currentConversation.messages.length > 0;

  // AI Agents configuration
  const agents: Agent[] = [
    {
      id: 'parenting-style',
      name: 'Parenting Style Analyst',
      icon: Heart,
      color: 'bg-pink-500',
      specialties: ['Parenting Styles', 'Behavioral Analysis', 'Family Dynamics'],
      active: true,
      confidence: 92,
      description: 'I analyze your parenting approach and provide personalized guidance based on your style, family dynamics, and child\'s needs.',
      exampleQuestions: [
        'What\'s my parenting style and how can I improve it?',
        'How do I handle discipline with my approach?',
        'What strategies work best for my family dynamics?'
      ]
    },
    {
      id: 'child-development',
      name: 'Child Development Advisor',
      icon: Baby,
      color: 'bg-blue-500',
      specialties: ['Developmental Milestones', 'Learning Activities', 'Cognitive Growth'],
      active: true,
      confidence: 88,
      description: 'I help track your child\'s developmental milestones, suggest age-appropriate activities, and provide guidance on cognitive and physical growth.',
      exampleQuestions: [
        'Is my child meeting their developmental milestones?',
        'What activities are appropriate for my child\'s age?',
        'How can I support my child\'s learning at home?'
      ]
    },
    {
      id: 'crisis-intervention',
      name: 'Crisis Intervention Specialist',
      icon: Shield,
      color: 'bg-red-500',
      specialties: ['Crisis Management', 'Behavioral Emergencies', 'Safety Protocols'],
      active: true,
      confidence: 95,
      description: 'I provide immediate support for behavioral emergencies, crisis management strategies, and safety protocols for urgent situations.',
      exampleQuestions: [
        'My child is having a severe behavioral episode, what do I do?',
        'How do I handle aggressive behavior safely?',
        'What are the warning signs I should watch for?'
      ]
    },
    {
      id: 'community-connector',
      name: 'Community Connector',
      icon: Users,
      color: 'bg-green-500',
      specialties: ['Resource Matching', 'Community Groups', 'Professional Referrals'],
      active: true,
      confidence: 85,
      description: 'I help you find local resources, connect with other parents, and match you with professional services in your area.',
      exampleQuestions: [
        'What parenting resources are available in my area?',
        'How can I connect with other parents?',
        'Do you know any child psychologists near me?'
      ]
    }
  ];

  // Real chat conversations from backend
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);

  const filteredConversations = chatConversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedConversations = {
    general: filteredConversations.filter(conversation => {
      const isGeneral = !conversation.childId || conversation.childId === null || conversation.childId === undefined || conversation.childId === '' || conversation.childId === 'null';
      console.log(`Conversation ${conversation.id} (childId: "${conversation.childId}") is general: ${isGeneral}`);
      return isGeneral;
    }),
    children: children.map(child => ({
      child,
      conversations: filteredConversations.filter(conversation => {
        // Skip conversations that are general (no child or null child)
        if (!conversation.childId || conversation.childId === null || conversation.childId === undefined || conversation.childId === '' || conversation.childId === 'null') {
          return false;
        }
        
        // Debug logging to see what we're comparing
        console.log(`Comparing conversation.childId: "${conversation.childId}" (type: ${typeof conversation.childId}) with child.id: "${child.id}" (type: ${typeof child.id})`);
        
        // More robust comparison - handle both string and number types
        const conversationChildId = conversation.childId?.toString();
        const childId = child.id?.toString();
        
        // Also check for numeric equality
        const numericMatch = conversation.childId === child.id;
        const stringMatch = conversationChildId === childId;
        
        const matches = stringMatch || numericMatch;
        if (matches) {
          console.log(`✓ Conversation ${conversation.id} matches child ${child.id} (${child.name})`);
        } else {
          console.log(`✗ Conversation ${conversation.id} does NOT match child ${child.id} (${child.name})`);
          console.log(`  conversation.childId: "${conversation.childId}" (${typeof conversation.childId})`);
          console.log(`  child.id: "${child.id}" (${typeof child.id})`);
          console.log(`  stringMatch: ${stringMatch}, numericMatch: ${numericMatch}`);
        }
        return matches;
      })
    }))
  };

  // Debug grouped conversations
  console.log('Grouped conversations:', groupedConversations);
  console.log('Current conversation:', currentConversation);
  console.log('Children:', children);
  
  // Debug: Show what conversations are being grouped where
  console.log('=== GROUPING DEBUG ===');
  console.log('General conversations:', groupedConversations.general.map(c => ({ id: c.id, childId: c.childId, title: c.title })));
  groupedConversations.children.forEach(({ child, conversations }) => {
    console.log(`${child.name} (${child.id}) conversations:`, conversations.map(c => ({ id: c.id, childId: c.childId, title: c.title })));
  });
  console.log('=== END GROUPING DEBUG ===');
  
  // Test child_id comparison
  if (children.length > 0 && chatConversations.length > 0) {
    console.log('=== CHILD ID COMPARISON TEST ===');
    const testChild = children[0];
    const testConversation = chatConversations.find(c => c.childId);
    if (testConversation) {
      console.log(`Test child: id="${testChild.id}" (type: ${typeof testChild.id})`);
      console.log(`Test conversation: childId="${testConversation.childId}" (type: ${typeof testConversation.childId})`);
      const testMatch = testChild.id?.toString() === testConversation.childId?.toString();
      console.log(`Test match: ${testMatch}`);
    }
    console.log('=== END TEST ===');
  }

  const quickSuggestions = [
    "How can I help my child with bedtime fears?",
    "What are age-appropriate chores for my child?",
    "My toddler is having tantrums, what should I do?",
    "How do I encourage reading habits?",
    "Screen time guidelines for my child's age",
    "Healthy meal ideas for picky eaters"
  ];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  // Check authentication and fetch data on mount
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        // First, try to verify authentication with the backend
        const authResponse = await fetch(`${API_BASE_URL}/me`, {
          credentials: 'include'
        });
        
        if (authResponse.ok) {
          // User is authenticated, fetch data
          console.log('User is authenticated, fetching data...');
          await Promise.all([fetchChildren(), fetchConversations()]);
        } else {
          // User is not authenticated, redirect to login
          console.log('User not authenticated, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // On error, redirect to login as a fallback
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndFetch();
  }, [navigate]);

  // Function to fetch children from backend
  const fetchChildren = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/children`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Raw children data:', data);
        // Transform the data to match the expected format
        const transformedChildren = data.map((child: any) => ({
          id: child.child_id?.toString() || child.id?.toString() || '',
          name: child.name,
          age: child.age,
          gender: child.gender
        }));       
   
        
        setChildren(transformedChildren);
      } else {
        console.error('Failed to fetch children:', response.status, response.statusText);
        if (response.status === 401) {
          console.log('Unauthorized, redirecting to login');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  // Function to fetch conversations from backend
  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Raw conversations data:', data);
        
        // Transform the data to ensure proper childId handling
        const transformedConversations = data.map((conv: any) => ({
          ...conv,
          childId: conv.childId ? conv.childId.toString() : null,
          id: conv.id.toString()
        }));
        
        console.log('Transformed conversations:', transformedConversations);
        
        // Debug: Log each conversation's agent information
        transformedConversations.forEach((conv: any) => {
          console.log(`🔍 Conversation ${conv.id} agent info:`, {
            enabledAgents: conv.enabledAgents,
            primaryAgentType: conv.primaryAgentType,
            conversationType: conv.conversationType,
            title: conv.title,
            childId: conv.childId,
            childName: conv.childName
          });
        });
               
        setChatConversations(transformedConversations);
      } else {
        console.error('Failed to fetch conversations:', response.status, response.statusText);
        if (response.status === 401) {
          console.log('Unauthorized, redirecting to login');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };



  // Function to restore conversation state from backend data
  const restoreConversationState = (conversation: ChatConversation) => {
    console.log('🔍 Restoring conversation state:', conversation);
    console.log('🔍 enabledAgents:', conversation.enabledAgents);
    console.log('🔍 primaryAgentType:', conversation.primaryAgentType);
    console.log('🔍 conversationType:', conversation.conversationType);
    console.log('🔍 childId:', conversation.childId);
    console.log('🔍 childName:', conversation.childName);
    
    // Determine if conversation was in manual mode based on conversation type and enabled agents
    const wasManualMode = conversation.conversationType === 'agent-specific' || 
                          (conversation.enabledAgents && conversation.enabledAgents.length > 0);
    
    // Set the mode and agents based on conversation data
    const newAutoMode = !wasManualMode;
    
    // For manual mode, use the enabled agents from the conversation
    // For auto mode, use all agents
    let newEnabledAgents: string[] = [];
    
    if (wasManualMode) {
      // Manual mode - use the specific agents that were enabled
      newEnabledAgents = conversation.enabledAgents || [];
      
      // If no enabled agents but we have a primary agent type, map it to agent ID
      if (newEnabledAgents.length === 0 && conversation.primaryAgentType) {
        const agentMapping: { [key: string]: string } = {
          'Parenting Style Analyst': 'parenting-style',
          'Child Development Advisor': 'child-development',
          'Crisis Intervention Specialist': 'crisis-intervention',
          'Community Connector': 'community-connector'
        };
        const mappedAgent = agentMapping[conversation.primaryAgentType];
        if (mappedAgent) {
          newEnabledAgents = [mappedAgent];
        }
      }
      
      // Also check if enabled agents are full names and convert them to IDs
      if (newEnabledAgents.length > 0) {
        const agentMapping: { [key: string]: string } = {
          'Parenting Style Analyst': 'parenting-style',
          'Child Development Advisor': 'child-development',
          'Crisis Intervention Specialist': 'crisis-intervention',
          'Community Connector': 'community-connector'
        };
        
        // Convert any full names to IDs
        newEnabledAgents = newEnabledAgents.map(agent => {
          return agentMapping[agent] || agent;
        });
      }
      
      // If still no agents, default to all agents (fallback)
      if (newEnabledAgents.length === 0) {
        newEnabledAgents = ['parenting-style', 'child-development', 'crisis-intervention', 'community-connector'];
      }
    } else {
      // Auto mode - use all agents
      newEnabledAgents = ['parenting-style', 'child-development', 'crisis-intervention', 'community-connector'];
    }
    
    console.log('🔍 wasManualMode:', wasManualMode);
    console.log('🔍 Setting autoMode to:', newAutoMode);
    console.log('🔍 Setting enabledAgents to:', newEnabledAgents);
    
    setAutoMode(newAutoMode);
    setEnabledAgents(newEnabledAgents);
    
    // Store original state for change detection
    setOriginalConversationState({
      autoMode: newAutoMode,
      enabledAgents: [...newEnabledAgents]
    });
  };

  // Function to check if conversation state has changed
  const hasConversationStateChanged = (): boolean => {
    if (!originalConversationState) return false;
    
    const currentState = {
      autoMode,
      enabledAgents: [...enabledAgents].sort()
    };
    
    const originalState = {
      autoMode: originalConversationState.autoMode,
      enabledAgents: [...originalConversationState.enabledAgents].sort()
    };
    
    return JSON.stringify(currentState) !== JSON.stringify(originalState);
  };

  // Function to show mode change confirmation dialog
  const showModeChangeDialog = (newMode: boolean) => {
    const isSwitchingToAuto = newMode;
    const title = isSwitchingToAuto ? "Switch to Auto Mode?" : "Switch to Manual Mode?";
    const message = isSwitchingToAuto 
      ? "You're switching from manual to auto mode.\n\nAuto mode will automatically select the best agent for each question."
      : "You're switching from auto to manual mode.\n\nManual mode allows you to select specific agents for your questions.";
    
    setConfirmationDialog({
      isOpen: true,
      type: 'mode',
      title,
      message,
      confirmText: isSwitchingToAuto ? "Switch to Auto" : "Switch to Manual",
      cancelText: "Keep Current",
      onConfirm: () => {
        setAutoMode(newMode);
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
        updateConversationMetadata();
      },
      onCancel: () => {
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Function to show agent change confirmation dialog
  const showAgentChangeDialog = (agentId: string, isEnabling: boolean) => {
    const agent = agents.find(a => a.id === agentId);
    const agentName = agent ? agent.name : 'Unknown Agent';
    
    const title = isEnabling ? `Enable ${agentName}?` : `Disable ${agentName}?`;
    const message = isEnabling
      ? `You're enabling ${agentName} for this conversation.\n\nThis conversation will continue with the new agent configuration.`
      : `You're disabling ${agentName} for this conversation.\n\nThis conversation will continue with the updated agent configuration.`;
    
    setConfirmationDialog({
      isOpen: true,
      type: 'agent',
      title,
      message,
      confirmText: isEnabling ? "Enable Agent" : "Disable Agent",
      cancelText: "Keep Current",
      onConfirm: () => {
        if (isEnabling) {
          setEnabledAgents(prev => [...prev, agentId]);
        } else {
          setEnabledAgents(prev => prev.filter(id => id !== agentId));
        }
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
        updateConversationMetadata();
      },
      onCancel: () => {
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Function to update conversation metadata in backend
  const updateConversationMetadata = async () => {
    if (!currentConversation) return;
    
    try {
      console.log('🔍 Updating conversation metadata:', {
        conversation_id: currentConversation.id,
        autoMode,
        enabledAgents,
        conversation_type: autoMode ? 'general' : 'agent-specific'
      });
      
      const response = await fetch(`${API_BASE_URL}/api/conversations/${currentConversation.id}/update-metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          conversation_type: autoMode ? 'general' : 'agent-specific',
          enabled_agents: enabledAgents,
          primary_agent_type: enabledAgents.length === 1 ? agents.find(a => a.id === enabledAgents[0])?.name : null
        })
      });
      
      if (response.ok) {
        console.log('Conversation metadata updated successfully');
        // Update the original state to reflect the new state
        setOriginalConversationState({
          autoMode,
          enabledAgents: [...enabledAgents]
        });
      } else {
        console.error('Failed to update conversation metadata');
      }
    } catch (error) {
      console.error('Error updating conversation metadata:', error);
    }
  };

  // Function to load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Cookies:', document.cookie);
      
      console.log('🔍 Debug: Making request to:', `${API_BASE_URL}/api/conversations/${conversationId}/messages`);
      console.log('🔍 Debug: Cookies:', document.cookie);
      
      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const messages = await response.json();
        console.log('Received messages:', messages);
        
        // Transform messages to match the expected format
        const transformedMessages = messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          agent: msg.agent || 'AI Assistant',
          confidence: msg.confidence || 85,
          references: msg.references || []
        }));
        
        console.log('Transformed messages:', transformedMessages);
        
        // Find the conversation in the current state
        console.log('Looking for conversation with ID:', conversationId, 'Type:', typeof conversationId);
        console.log('Available conversations:', chatConversations.map(c => ({ id: c.id, type: typeof c.id, title: c.title })));
        
        const conversation = chatConversations.find(c => c.id.toString() === conversationId.toString());
        console.log('Found conversation:', conversation);
        
        if (conversation) {
          // Create a new conversation object with the loaded messages
          const conversationWithMessages = {
            ...conversation,
            messages: transformedMessages
          };
          console.log('Setting current conversation with messages:', conversationWithMessages);
          
          // Set the current conversation with messages
          setCurrentConversation(conversationWithMessages);
          
          // Restore conversation state (mode and agents)
          restoreConversationState(conversationWithMessages);
          
          // Also update the conversation in the chatConversations array
          setChatConversations(prev => prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, messages: transformedMessages }
              : conv
          ));
        } else {
          console.error('Conversation not found in state:', conversationId);
          console.log('Available conversations:', chatConversations.map(c => ({ id: c.id, title: c.title })));
          
          // If conversation not found in state, try to fetch it from the backend
          console.log('Attempting to fetch conversation from backend...');
          const convResponse = await fetch(`${API_BASE_URL}/api/conversations`, {
            credentials: 'include'
          });
          if (convResponse.ok) {
            const allConversations = await convResponse.json();
            const backendConversation = allConversations.find((c: any) => c.id === conversationId);
            if (backendConversation) {
              const conversationWithMessages = {
                ...backendConversation,
                childId: backendConversation.childId ? backendConversation.childId.toString() : null,
                id: backendConversation.id.toString(),
                messages: transformedMessages
              };
              console.log('Found conversation in backend, setting current conversation:', conversationWithMessages);
              setCurrentConversation(conversationWithMessages);
            }
          } else {
            console.error('Failed to fetch conversations from backend:', convResponse.status, convResponse.statusText);
            if (convResponse.status === 401) {
              console.log('Unauthorized, redirecting to login');
              navigate('/login');
            }
          }
        }
      } else {
        console.error('Failed to load messages:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        if (response.status === 401) {
          console.log('Unauthorized, redirecting to login');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const currentMessage = message; // Store the message before clearing
    setMessage(''); // Clear the input field immediately

    // Only create new conversation if we're on landing page (no current conversation)
    if (!currentConversation) {
      const newConversation: ChatConversation = {
        id: Date.now().toString(),
        title: currentMessage.length > 50 ? currentMessage.substring(0, 50) + '...' : currentMessage,
        messages: [],
        lastMessage: currentMessage,
        lastUpdated: new Date().toISOString(),
        participatingAgents: [],
        childId: selectedChild !== 'general' ? selectedChild : undefined,
        childName: selectedChild !== 'general' ? children.find(c => c.id === selectedChild)?.name : undefined
      };
      setCurrentConversation(newConversation);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    // Update current conversation with user message
    setCurrentConversation(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage]
    } : null);

    // Send message to backend
    try {
      // Determine manual agent if auto mode is disabled
      let manual_agent = null;
      console.log('🔍 DEBUG: Agent selection logic:', {
        autoMode,
        enabledAgents,
        enabledAgentsLength: enabledAgents.length,
        currentConversation: currentConversation?.id
      });
      
      if (!autoMode && enabledAgents.length === 1) {
        manual_agent = enabledAgents[0];
        console.log('🔍 DEBUG: Selected manual agent:', manual_agent);
      } else if (!autoMode) {
        console.log('🔍 DEBUG: Manual mode but multiple agents or no agents enabled');
      }
      
      const requestBody = {
        query: currentMessage,
        child_id: currentConversation?.childId ? parseInt(currentConversation.childId) : (selectedChild !== 'general' ? parseInt(selectedChild) : null),
        conversation_id: currentConversation?.id ? parseInt(currentConversation.id) : null,
        manual_agent: manual_agent
      };
      
      console.log('🔍 Frontend DEBUG: Sending request with:', {
        selectedChild,
        child_id: requestBody.child_id,
        conversation_id: requestBody.conversation_id,
        manual_agent: requestBody.manual_agent,
        autoMode,
        enabledAgents,
        currentConversationId: currentConversation?.id,
        query: currentMessage
      });
      
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Frontend DEBUG: Received response data:', data);
        
        // Check if response has the expected structure
        if (!data.response) {
          console.error('🔍 Frontend DEBUG: No response field in data:', data);
          // Add error message to conversation
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: "Sorry, I encountered an error while processing your request. Please try again.",
            sender: 'ai',
            timestamp: new Date(),
            agent: 'AI Assistant',
            confidence: 0
          };
          
          setCurrentConversation(prev => prev ? {
            ...prev,
            messages: [...prev.messages, errorResponse]
          } : null);
          return;
        }
        
        // Add AI response to conversation
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'ai',
          timestamp: new Date(),
          agent: data.agent_type || 'AI Assistant',
          confidence: 85,
          references: data.memories ? data.memories.map((m: any) => m.query).slice(0, 3) : []
        };

        console.log('🔍 Frontend DEBUG: Adding AI response to conversation:', aiResponse);

        setCurrentConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, aiResponse],
          id: data.conversation_id?.toString() || prev.id
        } : null);

        // Refresh conversations list
        fetchConversations();
      } else {
        console.error('🔍 Frontend DEBUG: Failed to send message:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔍 Frontend DEBUG: Error response text:', errorText);
        
        // Add error message to conversation
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: `Error: ${response.status} - ${response.statusText}. Please try again.`,
          sender: 'ai',
          timestamp: new Date(),
          agent: 'AI Assistant',
          confidence: 0
        };
        
        setCurrentConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, errorResponse]
        } : null);
        
        if (response.status === 401) {
          console.log('Unauthorized, redirecting to login');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('🔍 Frontend DEBUG: Error sending message:', error);
      
      // Add error message to conversation
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        agent: 'AI Assistant',
        confidence: 0
      };
      
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, errorResponse]
      } : null);
    }
  };

  const startNewChat = () => {
    setCurrentConversation(null);
    setMessage('');
    setSelectedChild('general');
    setOriginalConversationState(null);
    // Reset to default state for new conversations
    setAutoMode(true);
    setEnabledAgents(['parenting-style', 'child-development', 'crisis-intervention', 'community-connector']);
  };

  const handleConversationClick = async (conversation: ChatConversation) => {
    console.log('Conversation clicked:', conversation);
    console.log('Current conversation before click:', currentConversation);
    
    // Load messages for this conversation first
    await loadConversationMessages(conversation.id);
  };

  const toggleAgent = (agentId: string) => {
    // Only show confirmation if we have a current conversation with messages and in manual mode
    if (currentConversation && currentConversation.messages.length > 0 && !autoMode) {
      const isCurrentlyEnabled = enabledAgents.includes(agentId);
      const isEnabling = !isCurrentlyEnabled;
      
      // Check if this change would result in no agents enabled
      if (isCurrentlyEnabled && enabledAgents.length === 1) {
        // Don't allow disabling the last agent
        return;
      }
      
      showAgentChangeDialog(agentId, isEnabling);
    } else {
      // For new conversations or auto mode, allow direct changes
      setEnabledAgents(prev => {
        const newEnabled = prev.includes(agentId) 
          ? prev.filter(id => id !== agentId)
          : [...prev, agentId];
        
        // Ensure at least one agent is enabled
        if (newEnabled.length === 0) {
          return prev;
        }
        
        return newEnabled;
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  if (loading) {
    return (
      <div className="pt-16 flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMobileView('history')}
              className={`p-2 rounded-lg ${mobileView === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileView('chat')}
              className={`p-2 rounded-lg ${mobileView === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileView('agents')}
              className={`p-2 rounded-lg ${mobileView === 'agents' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Left Sidebar - Chat History */}
      <div className={`${mobileView === 'history' ? 'block' : 'hidden'} lg:block ${leftSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all duration-300`}>
        <div className="p-3 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={() => setLeftSidebarOpen(false)}
            className="ml-2 p-2 text-gray-500 hover:text-gray-700"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300">
          {/* General Conversations */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" />
                General ({groupedConversations.general.length})
              </h3>
            </div>
            <div className="space-y-2">
              {groupedConversations.general.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === conversation.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-xs text-gray-900 truncate">{conversation.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {conversation.lastMessage}
                  </div>
                  {/* {conversation.participatingAgents && conversation.participatingAgents.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1 truncate">
                      {conversation.participatingAgents.join(', ')}
                    </div>
                  )} */}
                  {conversation.primaryAgentType && (
                    <div className="text-xs text-gray-400 mt-1">
                      {conversation.primaryAgentType}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Children Conversations */}
          {groupedConversations.children.map(({ child, conversations }) => (
            <div key={child.id} className="p-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
                  <Baby className="w-4 h-4" />
                  {child.name} ({conversations.length})
                </h3>
              </div>
              <div className="space-y-2">
                {conversations.map(conversation => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      currentConversation?.id === conversation.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-xs text-gray-900 truncate">{conversation.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {conversation.lastMessage}
                    </div>
                    {/* {conversation.participatingAgents && conversation.participatingAgents.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1 truncate">
                        {conversation.participatingAgents.join(', ')}
                      </div>
                    )} */}
                    {conversation.primaryAgentType && (
                      <div className="text-xs text-gray-400 mt-1">
                        {conversation.primaryAgentType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                  className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-semibold text-gray-900">
                  {isGeneralChat ? 
                    `${currentConversation?.childName ? `Discussing ${currentConversation.childName}` : 'AI Parenting Assistant'}` :
                    'AI Agentic Advisory System'
                  }
                </h1>
              </div>
              
              {/* Child Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Context:</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  disabled={!!isGeneralChat}
                  className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="general">General Parenting</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.name} ({child.age} years old)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
              >
                <Settings className="w-5 h-5" />
              </button>
              {isGeneralChat && (
                <div className="text-xs text-gray-500 hidden lg:block">
                  To change context, start a new chat
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages - with proper scroll container */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLandingPage ? (
            /* Landing Page Content */
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-4 text-center max-w-6xl mx-auto">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  AI Agentic Advisory System
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Start a conversation with our specialized AI agents for personalized parenting guidance
                </p>
                
                {/* Enhanced Agent Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto mb-4">
                  {agents.map((agent) => {
                    const Icon = agent.icon;
                    const isEnabled = autoMode || enabledAgents.includes(agent.id);
                    
                    return (
                      <div
                        key={agent.id}
                        className={`p-3 border rounded-lg transition-all ${
                          isEnabled 
                            ? 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white' 
                            : 'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-6 h-6 ${agent.color} rounded-lg flex items-center justify-center ${!isEnabled ? 'opacity-50' : ''}`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-xs text-gray-900 leading-tight">{agent.name}</h3>
                            <p className="text-xs text-gray-600">{agent.confidence}%</p>
                          </div>
                        </div>
                        
                        <div className="text-left mb-2">
                          <h4 className="font-medium text-xs text-gray-700 mb-1">How I Can Help:</h4>
                          <p className="text-xs text-gray-600 leading-tight mb-2">
                            {agent.description}
                          </p>
                          
                          <h4 className="font-medium text-xs text-gray-700 mb-1">Examples:</h4>
                          <div className="space-y-1">
                            {agent.exampleQuestions.map((question, index) => (
                              <button
                                key={index}
                                onClick={() => setMessage(question)}
                                className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors leading-tight"
                              >
                                • {question}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-left">
                          <h4 className="font-medium text-xs text-gray-700 mb-1">Skills:</h4>
                          <div className="flex flex-wrap gap-1">
                            {agent.specialties.map((specialty, index) => (
                              <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full leading-none">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Simple Input Field */}
                <div className="flex gap-2 max-w-2xl mx-auto mb-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Ask about ${selectedChild !== 'general' ? children.find(c => c.id === selectedChild)?.name : 'parenting'}...`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>

                {/* Quick Suggestions */}
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Questions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="p-3 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                      >
                        <div className="flex items-start space-x-2">
                          <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* How I Can Help Section */}
                <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">How I Can Help</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Baby className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-700">Child Development</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-gray-700">Behavioral Support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700">Communication Tips</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-700">Activity Ideas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="p-4 space-y-4">
              {(() => {
                console.log('Rendering messages for conversation:', currentConversation);
                console.log('Messages array:', currentConversation?.messages);
                return null;
              })()}
              {currentConversation?.messages && currentConversation.messages.length > 0 ? (
                currentConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.sender === 'ai' && msg.agent && (
                        <div className="text-xs font-medium text-blue-600 mb-1">
                          {msg.agent}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      {msg.sender === 'ai' && msg.references && msg.references.length > 0 && (
                        <div className="text-xs mt-2 text-gray-600">
                          <div className="font-medium mb-1">References:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {msg.references.map((ref, index) => (
                              <li key={index} className="text-xs leading-tight">{ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="text-xs mt-2 text-gray-500">
                        {msg.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages in this conversation yet.</p>
                  <p className="text-sm">Start by sending a message below.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Only show when in conversation */}
        {!isLandingPage && (
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            {/* Manual Agent Selector */}
            {!autoMode && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Select Agent:</label>
                <div className="flex flex-wrap gap-2">
                  {agents.map(agent => {
                    const Icon = agent.icon;
                    const isEnabled = enabledAgents.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                          isEnabled 
                            ? 'bg-blue-100 border-blue-300 text-blue-700' 
                            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {agent.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Agent Control Center */}
      <div className={`${mobileView === 'agents' ? 'block' : 'hidden'} lg:block ${rightSidebarOpen ? 'w-80' : 'w-0'} bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden transition-all duration-300`}>
        <div className="p-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Agent Control Center</h2>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Auto/Manual Mode Toggle */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-700">Auto Mode</span>
            <button
              onClick={() => {
                // Only show confirmation if we have a current conversation with messages
                if (currentConversation && currentConversation.messages.length > 0 && originalConversationState) {
                  showModeChangeDialog(!autoMode);
                } else {
                  setAutoMode(!autoMode);
                }
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                autoMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  autoMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <p className="text-xs text-gray-500 leading-tight">
            {autoMode ? 'Agents automatically collaborate based on your questions' : 'Manually enable/disable specific agents'}
          </p>
        </div>

        {/* Agent Status */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="p-3">
            <h3 className="font-medium text-gray-900 mb-2 text-sm">Active Agents</h3>
            <div className="space-y-2">
              {agents.map(agent => {
                const IconComponent = agent.icon;
                const isEnabled = autoMode || enabledAgents.includes(agent.id);
                
                return (
                  <div key={agent.id} className={`border rounded-lg p-2 transition-all ${
                    isEnabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <div className={`w-6 h-6 ${agent.color} rounded-full flex items-center justify-center ${!isEnabled ? 'opacity-50' : ''}`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-xs text-gray-900 leading-tight">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.confidence}%</div>
                        </div>
                      </div>
                      {!autoMode && (
                        <button
                          onClick={() => toggleAgent(agent.id)}
                          className={`w-5 h-5 rounded-full border-2 transition-colors ${
                            isEnabled 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isEnabled && <div className="w-1.5 h-1.5 bg-white rounded-full mx-auto" />}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      <div className="font-medium mb-1">Skills:</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.specialties.map((specialty, index) => (
                          <span key={index} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs leading-none">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">System Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-xs">Memory System</span>
              <span className="text-green-600 flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-xs">Agent Network</span>
              <span className="text-green-600 flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-xs">Context Awareness</span>
              <span className="text-green-600 flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Buttons for Desktop */}
      {!leftSidebarOpen && (
        <div className="hidden lg:flex fixed top-28 left-4 z-30">
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {!rightSidebarOpen && (
        <div className="hidden lg:flex fixed top-28 right-4 z-30">
          <button
            onClick={() => setRightSidebarOpen(true)}
            className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmationDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {confirmationDialog.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">
              {confirmationDialog.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmationDialog.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {confirmationDialog.cancelText}
              </button>
              <button
                onClick={confirmationDialog.onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                {confirmationDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;