import { useState, useEffect, useMemo } from 'react';
import { Award, Plus, Filter, CheckCircle, XCircle, Loader2, User, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, getSubjectName, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { ExamScore, Student } from '../../shared/types';

export default function ExamScorePage() {
  const { coachId } = useAuthStore();
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<number | ''>('');
  const [passedFilter, setPassedFilter] = useState<boolean | ''>('');

  const [formData, setFormData] = useState({
    studentId: '',
    subject: '',
    score: '',
    examDate: formatDate(new Date()),
    remark: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: { subject?: number; passed?: boolean } = {};
      if (subjectFilter !== '') params.subject = subjectFilter;
      if (passedFilter !== '') params.passed = passedFilter;

      const [scoresRes, studentsRes] = await Promise.all([
        api.exams.scores.list(params),
        api.students.list({ pageSize: 100 }),
      ]);
      if (scoresRes.success && scoresRes.data) {
        setScores(scoresRes.data);
      }
      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data.list);
      }
    } catch (error) {
      console.error('Fetch data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subjectFilter, passedFilter]);

  const autoPassed = useMemo(() => {
    const score = parseFloat(formData.score);
    const subject = parseInt(formData.subject);
    if (isNaN(score) || isNaN(subject)) return null;
    const passScore = subject === 2 ? 80 : 90;
    return score >= passScore;
  }, [formData.score, formData.subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.subject || !formData.score || !formData.examDate) return;

    setSubmitting(true);
    try {
      const res = await api.exams.scores.create({
        studentId: parseInt(formData.studentId),
        subject: parseInt(formData.subject),
        score: parseFloat(formData.score),
        passed: autoPassed ?? false,
        examDate: formData.examDate,
        coachId: coachId ?? undefined,
        remark: formData.remark || undefined,
      });
      if (res.success) {
        setFormData({
          studentId: '',
          subject: '',
          score: '',
          examDate: formatDate(new Date()),
          remark: '',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Submit score failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilter = () => {
    fetchData();
  };

  const handleReset = () => {
    setSubjectFilter('');
    setPassedFilter('');
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">成绩录入</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-500" />
          录入成绩
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学员 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">请选择学员</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              科目 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">请选择科目</option>
              <option value="1">科目一（理论）</option>
              <option value="2">科目二（场地）</option>
              <option value="3">科目三（道路）</option>
              <option value="4">科目四（安全文明）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              placeholder="请输入分数"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              考试日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.examDate}
              onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <input
              type="text"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="请输入备注"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="md:col-span-2 flex items-end gap-4">
            {autoPassed !== null && (
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg',
                  autoPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}
              >
                {autoPassed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{autoPassed ? '通过' : '未通过'}</span>
                <span className="text-sm opacity-75">
                  （及格线：{parseInt(formData.subject) === 2 ? 80 : 90}分）
                </span>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !formData.studentId || !formData.subject || !formData.score}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              提交
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            成绩列表
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value ? parseInt(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">全部科目</option>
                <option value="1">科目一</option>
                <option value="2">科目二</option>
                <option value="3">科目三</option>
                <option value="4">科目四</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={passedFilter === '' ? '' : String(passedFilter)}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassedFilter(val === '' ? '' : val === 'true');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">全部状态</option>
                <option value="true">已通过</option>
                <option value="false">未通过</option>
              </select>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              查询
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : scores.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无成绩数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">学员</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">科目</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分数</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">考试日期</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">录入教练</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">备注</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score) => (
                  <tr key={score.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-800">{score.studentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        {getSubjectName(score.subject)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'text-lg font-bold',
                          score.passed ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {score.score}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                          score.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        )}
                      >
                        {score.passed ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {score.passed ? '通过' : '未通过'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{score.examDate}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{score.coachName || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{score.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
