import { useState, useEffect } from 'react';
import { FolderKanban, Archive, CheckCircle, Loader2, User, Award, Calendar, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { getSubjectName, getLicenseTypeName, cn } from '@/lib/utils';

interface ArchiveCandidate {
  id: number;
  name: string;
  phone: string;
  idCard: string;
  licenseType: string;
  enrollDate: string;
  scores: Array<{ subject: number; score: number; passed: boolean; examDate: string }>;
}

interface ArchivedStudent {
  id: number;
  studentId: number;
  studentName: string;
  archiveDate: string;
  archiveType: string;
  phone: string;
  licenseType: string;
}

export default function ExamArchive() {
  const [candidates, setCandidates] = useState<ArchiveCandidate[]>([]);
  const [archived, setArchived] = useState<ArchivedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'candidates' | 'archived'>('candidates');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candidatesRes, archivedRes] = await Promise.all([
        api.exams.archiveCandidates(),
        api.exams.archivedList(),
      ]);
      if (candidatesRes.success && candidatesRes.data) {
        setCandidates(candidatesRes.data);
      }
      if (archivedRes.success && archivedRes.data) {
        setArchived(archivedRes.data);
      }
    } catch (error) {
      console.error('Fetch data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleArchive = async (studentId: number) => {
    setArchiving(studentId);
    try {
      const res = await api.exams.archive(studentId);
      if (res.success) {
        fetchData();
      }
    } catch (error) {
      console.error('Archive failed:', error);
    } finally {
      setArchiving(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">档案管理</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          <button
            onClick={() => setActiveTab('candidates')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'candidates'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            待归档 ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'archived'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            已归档 ({archived.length})
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : activeTab === 'candidates' ? (
          candidates.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无待归档的学员</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((student) => (
                <div
                  key={student.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{student.name}</h3>
                      <p className="text-sm text-gray-500">
                        {getLicenseTypeName(student.licenseType)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{student.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>报名日期：{student.enrollDate}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <p className="text-xs text-gray-500 mb-2">各科成绩：</p>
                    <div className="grid grid-cols-2 gap-2">
                      {student.scores.map((score) => (
                        <div
                          key={score.subject}
                          className="flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-1.5"
                        >
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-600">
                            {getSubjectName(score.subject)}：{score.score}分
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleArchive(student.id)}
                    disabled={archiving === student.id}
                    className="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {archiving === student.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    归档
                  </button>
                </div>
              ))}
            </div>
          )
        ) : archived.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <FolderKanban className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无已归档的学员</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    学员姓名
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    手机号
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    准驾车型
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    归档日期
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    归档类型
                  </th>
                </tr>
              </thead>
              <tbody>
                {archived.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Award className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-800">{item.studentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.phone}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {getLicenseTypeName(item.licenseType)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.archiveDate}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {item.archiveType === 'graduation' ? '毕业归档' : item.archiveType}
                      </span>
                    </td>
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
