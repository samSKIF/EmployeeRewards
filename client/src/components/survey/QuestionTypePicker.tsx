import { useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  BarChart3,
  CircleDot,
  CheckSquare,
  Star,
  List,
  ArrowDownUp,
  SlidersHorizontal,
  Grid,
  ArrowLeftRight,
  Clock,
  ToggleLeft,
  AlignJustify,
  Upload,
  Image,
  CircleDollarSign,
  MousePointer2,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define the question types and their properties
interface QuestionTypeInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: string;
  preview: React.ReactNode;
}

const questionTypes: QuestionTypeInfo[] = [
  // Feedback & Rating Category
  {
    id: 'nps',
    name: 'Net Promoter Score (NPS)',
    icon: <BarChart3 className="h-4 w-4 mr-2" />,
    description:
      'Measures customer loyalty with a 0-10 scale, categorizing responses into detractors, passives, and promoters.',
    category: 'Feedback & Rating',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          How likely are you to recommend our company to a friend or colleague?
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            let bgColor = 'bg-red-500';
            if (n >= 7 && n <= 8) bgColor = 'bg-yellow-400';
            if (n >= 9) bgColor = 'bg-green-500';

            return (
              <button
                key={n}
                className={`flex-1 text-white font-medium ${bgColor} rounded-md py-2 px-1 text-xs hover:opacity-90 transition-opacity`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span>Not Likely</span>
          <span>Very Likely</span>
        </div>
      </div>
    ),
  },
  {
    id: 'star',
    name: 'Star Rating',
    icon: <Star className="h-4 w-4 mr-2" />,
    description:
      'Rate using 1-5 stars, intuitive for satisfaction/quality feedback.',
    category: 'Feedback & Rating',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">How would you rate your experience?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className="h-8 w-8 text-amber-400 cursor-pointer"
              fill={n <= 3 ? '#fbbf24' : 'none'}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'scale',
    name: 'Scale (1-5)',
    icon: <List className="h-4 w-4 mr-2" />,
    description: 'Discrete numeric scale with buttons labeled 1 through 5.',
    category: 'Feedback & Rating',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">Please rate how easy the task was:</p>
        <div className="flex justify-between mb-1 text-xs">
          <span>Very Difficult</span>
          <span>Very Easy</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className="flex-1 border rounded-md py-2 hover:bg-gray-100"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'likert',
    name: 'Likert Scale',
    icon: <List className="h-4 w-4 mr-2" />,
    description: 'Agreement scale (e.g., Strongly Disagree to Strongly Agree).',
    category: 'Feedback & Rating',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          I am satisfied with the clarity of information provided.
        </p>
        <div className="flex gap-1">
          {[
            'Strongly Disagree',
            'Disagree',
            'Neutral',
            'Agree',
            'Strongly Agree',
          ].map((label) => (
            <button
              key={label}
              className="flex-1 border rounded-md py-1 px-1 text-xs hover:bg-gray-100"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'slider',
    name: 'Slider Scale',
    icon: <SlidersHorizontal className="h-4 w-4 mr-2" />,
    description: 'Continuous slider for granular feedback (e.g., 0-100).',
    category: 'Feedback & Rating',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">How satisfied are you with our service?</p>
        <div className="flex justify-between mb-1 text-xs">
          <span>Not at all</span>
          <span>Completely</span>
        </div>
        <input
          type="range"
          className="w-full"
          min="0"
          max="100"
          defaultValue="75"
        />
        <div className="text-center mt-1 text-xs">
          <span className="font-medium">75%</span>
        </div>
      </div>
    ),
  },
  {
    id: 'semantic',
    name: 'Semantic Differential',
    icon: <ArrowLeftRight className="h-4 w-4 mr-2" />,
    description:
      "Rating between bipolar adjective pairs, e.g., 'Difficult - Easy'.",
    category: 'Feedback & Rating',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">Rate our interface:</p>
        <div className="grid grid-cols-7 items-center gap-2">
          <span className="text-xs">Difficult</span>
          <input type="radio" name="semantic" className="h-3 w-3" />
          <input type="radio" name="semantic" className="h-3 w-3" />
          <input
            type="radio"
            name="semantic"
            className="h-3 w-3"
            checked
            readOnly
          />
          <input type="radio" name="semantic" className="h-3 w-3" />
          <input type="radio" name="semantic" className="h-3 w-3" />
          <span className="text-xs">Easy</span>
        </div>
      </div>
    ),
  },

  // Choice & Selection Category
  {
    id: 'single',
    name: 'Single Choice',
    icon: <CircleDot className="h-4 w-4 mr-2" />,
    description: 'Select exactly one option from a list using radio buttons.',
    category: 'Choice & Selection',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          What is your preferred method of communication?
        </p>
        <div className="space-y-2">
          {['Email', 'Phone', 'In-person', 'Video call'].map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <input
                type="radio"
                id={option}
                name="communication"
                className="h-4 w-4"
              />
              <label htmlFor={option} className="text-sm">
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'multiple',
    name: 'Multiple Choice',
    icon: <CheckSquare className="h-4 w-4 mr-2" />,
    description: 'Select any number of options using checkboxes.',
    category: 'Choice & Selection',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          Which of these technologies do you use? (Select all that apply)
        </p>
        <div className="space-y-2">
          {[
            'Mobile apps',
            'Web applications',
            'Desktop software',
            'Cloud services',
          ].map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <input type="checkbox" id={option} className="h-4 w-4" />
              <label htmlFor={option} className="text-sm">
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'dropdown',
    name: 'Dropdown (Select)',
    icon: <ChevronRight className="h-4 w-4 mr-2" />,
    description: 'Space-efficient dropdown for long lists of options.',
    category: 'Choice & Selection',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">In which department do you work?</p>
        <select className="w-full border p-2 rounded-md text-sm">
          <option>Select a department</option>
          <option>Engineering</option>
          <option>Marketing</option>
          <option>Finance</option>
          <option>Human Resources</option>
          <option>Product</option>
        </select>
      </div>
    ),
  },
  {
    id: 'ranking',
    name: 'Ranking',
    icon: <ArrowDownUp className="h-4 w-4 mr-2" />,
    description: 'Drag-and-drop or assign ranks to a list of items.',
    category: 'Choice & Selection',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          Rank these features in order of importance:
        </p>
        <div className="space-y-2">
          {['Performance', 'Security', 'Ease of use', 'Price'].map(
            (option, i) => (
              <div
                key={option}
                className="flex items-center border p-2 rounded-md bg-white"
              >
                <span className="font-medium mr-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">
                  {i + 1}
                </span>
                <span className="text-sm">{option}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className="h-8 w-8 p-0 flex items-center justify-center text-gray-500 opacity-50"
                    disabled={true}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    className="h-8 w-8 p-0 flex items-center justify-center text-gray-500 opacity-50"
                    disabled={true}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    ),
  },
  {
    id: 'image',
    name: 'Image Choice',
    icon: <Image className="h-4 w-4 mr-2" />,
    description: 'Select from options presented as images.',
    category: 'Choice & Selection',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">Which design do you prefer?</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="border rounded-md p-1 cursor-pointer hover:border-blue-500"
            >
              <div className="bg-gray-200 w-full h-16 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">Design {n}</span>
              </div>
              <div className="mt-1 flex items-center justify-center">
                <input type="radio" name="design" className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // Matrix & Complex Types
  {
    id: 'matrix',
    name: 'Matrix/Grid',
    icon: <Grid className="h-4 w-4 mr-2" />,
    description: 'Table format for rating multiple items on the same scale.',
    category: 'Matrix & Complex',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          Rate the following aspects of our service:
        </p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1"></th>
              <th className="text-center p-1">Poor</th>
              <th className="text-center p-1">Fair</th>
              <th className="text-center p-1">Good</th>
              <th className="text-center p-1">Excellent</th>
            </tr>
          </thead>
          <tbody>
            {['Speed', 'Quality', 'Support'].map((aspect) => (
              <tr key={aspect} className="border-t">
                <td className="p-1">{aspect}</td>
                {[1, 2, 3, 4].map((n) => (
                  <td key={n} className="text-center p-1">
                    <input type="radio" name={aspect} className="h-3 w-3" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 'constant-sum',
    name: 'Constant Sum',
    icon: <CircleDollarSign className="h-4 w-4 mr-2" />,
    description: 'Allocate a fixed total across multiple items.',
    category: 'Matrix & Complex',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          Distribute 100 points across these priorities:
        </p>
        <div className="space-y-2">
          {['Quality', 'Cost', 'Speed', 'Innovation'].map((item) => (
            <div key={item} className="flex items-center">
              <span className="text-sm w-24">{item}</span>
              <input
                type="number"
                min="0"
                max="100"
                className="border rounded-md p-1 w-16 text-sm"
                defaultValue="25"
              />
              <span className="ml-1 text-xs">points</span>
            </div>
          ))}
        </div>
        <div className="text-right mt-2 text-sm font-medium">
          Total: 100/100
        </div>
      </div>
    ),
  },
  {
    id: 'heatmap',
    name: 'Heatmap / Click Map',
    icon: <MousePointer2 className="h-4 w-4 mr-2" />,
    description: 'Click on an image to indicate areas of interest or feedback.',
    category: 'Matrix & Complex',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          Click on the area that got your attention first:
        </p>
        <div className="border bg-gray-100 w-full h-28 rounded relative cursor-pointer">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-gray-500">Website Image</span>
          </div>
          <div className="absolute top-1/3 left-1/4 w-4 h-4 rounded-full bg-blue-500 opacity-50"></div>
        </div>
      </div>
    ),
  },

  // Text & Input Types
  {
    id: 'text',
    name: 'Text Response',
    icon: <AlignJustify className="h-4 w-4 mr-2" />,
    description: 'Free-form text box for comments or detailed feedback.',
    category: 'Text & Input',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          What feedback do you have about our recent changes?
        </p>
        <textarea
          className="w-full border rounded-md p-2 text-sm"
          rows={3}
          placeholder="Type your answer here..."
        ></textarea>
      </div>
    ),
  },
  {
    id: 'numeric',
    name: 'Numeric Input',
    icon: <Hash className="h-4 w-4 mr-2" />,
    description: 'Input that only accepts numbers (age, quantity, etc.).',
    category: 'Text & Input',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          How many hours per week do you use our product?
        </p>
        <input
          type="number"
          min="0"
          className="border rounded-md p-2 w-full text-sm"
          placeholder="Enter a number"
        />
      </div>
    ),
  },
  {
    id: 'datetime',
    name: 'Date/Time Picker',
    icon: <Clock className="h-4 w-4 mr-2" />,
    description: 'Calendar selector for dates or times.',
    category: 'Text & Input',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">
          When would you prefer to schedule this event?
        </p>
        <input type="date" className="border rounded-md p-2 w-full text-sm" />
      </div>
    ),
  },
  {
    id: 'toggle',
    name: 'Yes/No Toggle',
    icon: <ToggleLeft className="h-4 w-4 mr-2" />,
    description: 'Simple binary choice with a toggle switch.',
    category: 'Text & Input',
    preview: (
      <div className="w-full">
        <div className="flex justify-between items-center">
          <p className="text-sm">Would you like to receive our newsletter?</p>
          <div className="h-6 w-10 bg-gray-200 rounded-full relative">
            <div className="h-5 w-5 rounded-full absolute top-0.5 left-0.5 bg-white border"></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'file',
    name: 'File Upload',
    icon: <Upload className="h-4 w-4 mr-2" />,
    description: 'Allow respondents to upload documents or images.',
    category: 'Text & Input',
    preview: (
      <div className="w-full">
        <p className="text-sm mb-2">Please upload any relevant documents:</p>
        <div className="border border-dashed rounded-md p-4 text-center">
          <Upload className="h-5 w-5 mx-auto text-gray-400" />
          <p className="text-xs mt-1 text-gray-500">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-400">Supports PDF, DOC, JPG</p>
        </div>
      </div>
    ),
  },
];

// Group question types by category
const groupedQuestionTypes = questionTypes.reduce(
  (acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  },
  {} as Record<string, QuestionTypeInfo[]>
);

// Question Type Picker Component
interface QuestionTypePickerProps {
  onSelect: (type: string) => void;
  currentType?: string;
  onClose?: () => void;
}

export default function QuestionTypePicker({
  onSelect,
  currentType,
  onClose,
}: QuestionTypePickerProps) {
  const [open, setOpen] = useState(false);
  // Track previewType separately from the selectedType to allow showing previews without confirming selection
  const [previewType, setPreviewType] = useState<QuestionTypeInfo | null>(
    questionTypes.find((t) => t.id === currentType) || null
  );
  const [selectedType, setSelectedType] = useState<QuestionTypeInfo | null>(
    questionTypes.find((t) => t.id === currentType) || null
  );

  // Find the current selected question type name to display on the button
  const getButtonText = () => {
    if (selectedType) {
      return selectedType.name;
    }
    return currentType
      ? questionTypes.find((t) => t.id === currentType)?.name || 'Select type'
      : 'Select type';
  };

  // This only updates the preview but doesn't select the type
  const handlePreview = (type: QuestionTypeInfo) => {
    setPreviewType(type);
  };

  // This confirms the selection and closes the dialog
  const handleConfirmSelection = () => {
    if (previewType) {
      setSelectedType(previewType);
      onSelect(previewType.id);
      setOpen(false);
      // Call onClose if provided
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {getButtonText()}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Question Type</DialogTitle>
          <DialogDescription>
            Select the format that best suits your question.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-7 gap-4 mt-4">
          <div className="col-span-3">
            <Command className="rounded-lg border shadow-md">
              <CommandInput placeholder="Search question types..." />
              <CommandList>
                <CommandEmpty>No question type found.</CommandEmpty>
                {Object.entries(groupedQuestionTypes).map(
                  ([category, types]) => (
                    <CommandGroup key={category} heading={category}>
                      {types.map((type) => (
                        <CommandItem
                          key={type.id}
                          onSelect={() => handlePreview(type)}
                          className={`cursor-pointer ${previewType?.id === type.id ? 'bg-blue-50' : ''}`}
                        >
                          {type.icon}
                          <span>{type.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                )}
              </CommandList>
            </Command>
          </div>

          <div className="col-span-4 border rounded-lg p-4 bg-gray-50">
            {previewType ? (
              <>
                <div className="flex items-center mb-2">
                  {previewType.icon}
                  <h3 className="font-medium">{previewType.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {previewType.description}
                </p>
                <div className="border rounded-lg bg-white p-3 shadow-sm">
                  {previewType.preview}
                </div>
                <Button
                  className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleConfirmSelection}
                >
                  Select This Type
                </Button>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>Select a question type to see preview</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
