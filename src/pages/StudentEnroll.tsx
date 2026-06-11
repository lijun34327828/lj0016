import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import StepProgress from '@/components/enroll/StepProgress';
import EnrollStep1 from '@/components/enroll/EnrollStep1';
import EnrollStep2 from '@/components/enroll/EnrollStep2';
import EnrollStep3 from '@/components/enroll/EnrollStep3';
import type { Student } from '../../shared/types';

const steps = [
  { title: '基本信息', description: '填写学员资料' },
  { title: '证件上传', description: '上传相关证件' },
  { title: '确认提交', description: '核对信息并提交' },
];

export default function StudentEnroll() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepValid, setStepValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({
    enrollDate: formatDate(new Date()),
    status: 'pending',
  });

  const handleFormChange = (data: Partial<Student>) => {
    setFormData({ ...formData, ...data });
  };

  const handleNext = () => {
    if (stepValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.students.create(formData);
      if (res.success) {
        setSubmitSuccess(true);
      }
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">报名成功</h2>
          <p className="text-gray-500 mb-8">学员信息已提交，等待审核通过后即可开始预约练车</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/students')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              查看列表
            </button>
            <button
              onClick={() => {
                setSubmitSuccess(false);
                setCurrentStep(1);
                setFormData({
                  enrollDate: formatDate(new Date()),
                  status: 'pending',
                });
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              继续报名
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">学员报名</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <StepProgress currentStep={currentStep} steps={steps} />

        <div className="min-h-96">
          {currentStep === 1 && (
            <EnrollStep1
              formData={formData}
              onChange={handleFormChange}
              onValidChange={setStepValid}
            />
          )}
          {currentStep === 2 && (
            <EnrollStep2
              formData={formData}
              onChange={handleFormChange}
              onValidChange={setStepValid}
            />
          )}
          {currentStep === 3 && (
            <EnrollStep3 formData={formData} />
          )}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            上一步
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={!stepValid}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '确认提交'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
