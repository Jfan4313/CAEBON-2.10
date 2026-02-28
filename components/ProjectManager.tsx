import React, { useState, useEffect, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { projectStorageService } from '../services/projectStorage';
import { ProjectTemplate } from '../types/projectStorage';

/**
 * 项目管理组件
 * 提供可视化的项目管理界面，包括查看、加载、删除、重命名项目
 */
const ProjectManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { importProjectConfig, setNotification } = useProject();
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('updatedAt');
  const [showOnlyTemplates, setShowOnlyTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const list = await projectStorageService.getProjectList({
        sortBy,
        sortOrder: 'desc',
        templatesOnly: showOnlyTemplates
      });
      setProjects(list);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setNotification?.({ message: '加载项目列表失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [sortBy, showOnlyTemplates, setNotification]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 过滤项目
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 加载项目
  const handleLoadProject = async (project: ProjectTemplate) => {
    try {
      await importProjectConfig(project.data);
      setNotification?.({ message: `已加载项目：${project.name}`, type: 'success' });
      onClose();
    } catch (error) {
      console.error('Failed to load project:', error);
      setNotification?.({ message: '加载项目失败', type: 'error' });
    }
  };

  // 开始编辑项目名称
  const handleStartEdit = (project: ProjectTemplate) => {
    if (project.isTemplate) return;
    setEditingId(project.id);
    setEditingName(project.name);
  };

  // 保存编辑
  const handleSaveEdit = async (project: ProjectTemplate) => {
    if (!editingName.trim()) return;

    try {
      const updatedProject: ProjectTemplate = {
        ...project,
        name: editingName.trim()
      };
      await projectStorageService.saveProjectToStorage(updatedProject);
      setEditingId(null);
      loadProjects();
      setNotification?.({ message: '项目名称已更新', type: 'success' });
    } catch (error) {
      console.error('Failed to update project:', error);
      setNotification?.({ message: '更新项目名称失败', type: 'error' });
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // 删除项目
  const handleDeleteProject = async (id: string) => {
    try {
      const success = await projectStorageService.deleteProject(id);
      if (success) {
        setNotification?.({ message: '项目已删除', type: 'success' });
        loadProjects();
      } else {
        setNotification?.({ message: '无法删除模板项目', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      setNotification?.({ message: '删除项目失败', type: 'error' });
    }
    setShowDeleteConfirm(null);
  };

  // 导出项目
  const handleExportProject = (project: ProjectTemplate) => {
    projectStorageService.exportProjectConfig(project.data, {
      filename: `${project.name}_config`,
      formatted: true
    });
    setNotification?.({ message: '项目配置已导出', type: 'success' });
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">项目管理</h2>
            <p className="text-sm text-slate-500 mt-1">管理已保存的项目和模板</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="搜索项目名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="updatedAt">按更新时间</option>
            <option value="createdAt">按创建时间</option>
            <option value="name">按名称</option>
          </select>

          {/* Filter Templates */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyTemplates}
              onChange={(e) => setShowOnlyTemplates(e.target.checked)}
              className="form-checkbox h-5 w-5 text-primary rounded border-slate-300 focus:ring-primary/20"
            />
            <span className="text-sm text-slate-700">仅显示模板</span>
          </label>

          {/* Refresh */}
          <button
            onClick={loadProjects}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="刷新"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-slate-300">folder_open</span>
              <p className="text-slate-500 mt-4">
                {searchQuery ? '未找到匹配的项目' : '暂无项目'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`border rounded-xl p-4 hover:shadow-md transition-all ${
                    project.isTemplate
                      ? 'bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-3">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(project);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          {project.name}
                          {project.isTemplate && (
                            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">模板</span>
                          )}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Project Meta */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      更新于 {formatDate(project.updatedAt)}
                    </span>
                    {project.data.modules && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">extension</span>
                        {Object.values(project.data.modules).filter(m => m.isActive).length} 个模块
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {editingId === project.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(project)}
                          className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleLoadProject(project)}
                          className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          加载项目
                        </button>
                        <button
                          onClick={() => handleExportProject(project)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                          title="导出"
                        >
                          <span className="material-symbols-outlined">download</span>
                        </button>
                        {!project.isTemplate && (
                          <>
                            <button
                              onClick={() => handleStartEdit(project)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                              title="重命名"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(project.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                              title="删除"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === project.id && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700 mb-3">确定要删除项目 "{project.name}" 吗？此操作不可撤销。</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          删除
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-1.5 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <span className="text-sm text-slate-500">
            共 {filteredProjects.length} 个项目
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectManager;
