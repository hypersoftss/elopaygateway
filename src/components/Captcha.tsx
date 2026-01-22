import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
  value: string;
  onChange: (value: string) => void;
}

export const Captcha = ({ onVerify, value, onChange }: CaptchaProps) => {
  const { t } = useTranslation();
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<'+' | '-'>('+');

  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const op = Math.random() > 0.5 ? '+' : '-';
    
    // Ensure no negative results for subtraction
    if (op === '-' && n1 < n2) {
      setNum1(n2);
      setNum2(n1);
    } else {
      setNum1(n1);
      setNum2(n2);
    }
    setOperator(op);
    onChange('');
    onVerify(false);
  }, [onChange, onVerify]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  useEffect(() => {
    const correctAnswer = operator === '+' ? num1 + num2 : num1 - num2;
    const userAnswer = parseInt(value, 10);
    onVerify(userAnswer === correctAnswer);
  }, [value, num1, num2, operator, onVerify]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center bg-muted px-4 py-2 rounded-md font-mono text-lg min-w-[120px]">
        {num1} {operator} {num2} = ?
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('auth.captchaPlaceholder')}
        className="w-24"
        maxLength={3}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={generateCaptcha}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
};
