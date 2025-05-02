import React, { useState } from 'react';
import { Plus, GripVertical, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Priority {
  id: number;
  text: string;
  completed: boolean;
  date?: string;
}

const PrioritiesWidget: React.FC = () => {
  const [priorities, setPriorities] = useState<Priority[]>([
    {
      id: 1,
      text: 'Camping trip for the department',
      completed: false,
      date: '1 week old'
    },
    {
      id: 2,
      text: 'Send quarterly report to finance',
      completed: true,
      date: '2 days ago'
    },
    {
      id: 3,
      text: 'Schedule team building activity',
      completed: false,
      date: 'Yesterday'
    }
  ]);
  
  const [newPriority, setNewPriority] = useState('');

  const handleTogglePriority = (id: number) => {
    setPriorities(priorities.map(priority => 
      priority.id === id ? { ...priority, completed: !priority.completed } : priority
    ));
  };

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      setPriorities([
        ...priorities,
        {
          id: Date.now(),
          text: newPriority.trim(),
          completed: false,
          date: 'Just now'
        }
      ]);
      setNewPriority('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPriority();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-5">
        <h2 className="font-bold text-gray-800 text-lg mb-4">Priorities</h2>
        
        {/* Priority list */}
        <div className="space-y-4 mb-5">
          {priorities.map(priority => (
            <div key={priority.id} className="flex items-start group">
              <button className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex-1 flex items-start">
                <div 
                  onClick={() => handleTogglePriority(priority.id)}
                  className="mt-0.5 mr-2.5 cursor-pointer"
                >
                  {priority.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-teal-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div 
                    className={`text-sm ${priority.completed ? 'text-gray-400 line-through' : 'text-gray-700'} whitespace-nowrap overflow-hidden text-ellipsis`}
                  >
                    {priority.text}
                  </div>
                  {priority.date && (
                    <div className="text-xs text-gray-400 whitespace-nowrap">{priority.date}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Add new priority */}
        <div className="flex items-center border-t pt-3 border-gray-100">
          <button 
            className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-teal-500 mr-2 hover:bg-teal-100"
            onClick={handleAddPriority}
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            type="text"
            placeholder="Add a new priority..."
            className="flex-1 text-sm text-gray-700 focus:outline-none focus:ring-0 border-0"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

export default PrioritiesWidget;