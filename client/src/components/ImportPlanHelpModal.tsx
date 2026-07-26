import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SAMPLE_PLAN_JSON, SAMPLE_PLAN_YAML } from '@/lib/samplePlan';

type Format = 'json' | 'yaml';

interface Props {
  open: boolean;
  onClose: () => void;
  onChooseFile: () => void;
}

export function ImportPlanHelpModal({ open, onClose, onChooseFile }: Props) {
  const [format, setFormat] = useState<Format>('json');
  const [copied, setCopied] = useState(false);

  const sample = format === 'json' ? SAMPLE_PLAN_JSON : SAMPLE_PLAN_YAML;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sample);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title="Import a plan file">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Save a file shaped like this as <code className="text-ink">.json</code> or{' '}
          <code className="text-ink">.yaml</code>, then choose it below. Copy this sample
          as a starting point.
        </p>

        <div className="flex gap-1">
          {(['json', 'yaml'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1 text-xs font-semibold rounded-md uppercase ${
                format === f ? 'bg-btn-primary text-btn-primary-text' : 'text-muted hover:bg-surface-2'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative">
          <pre className="bg-surface-2 rounded-lg p-3 text-xs text-ink overflow-x-auto max-h-72 overflow-y-auto">
            {sample}
          </pre>
          <button
            onClick={handleCopy}
            aria-label="Copy sample plan"
            className="absolute top-2 right-2 p-1.5 rounded-md bg-surface hover:bg-canvas text-muted hover:text-ink transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onClose();
              onChooseFile();
            }}
          >
            Choose File to Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}
