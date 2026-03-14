import React from 'react';
import { useProjectEntry } from './hooks';

/**
 * 项目入口模块主组件
 * 提供项目信息录入功能
 */
export default function ProjectEntry() {
  const { projectData, updateProjectData, saveProject } = useProjectEntry();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">项目信息录入</h1>
        <p className="text-sm text-gray-500 mt-1">填写项目基础信息，开始收益评估</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            {/* 项目基础信息 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">项目基础信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目名称
                  </label>
                  <input
                    type="text"
                    value={projectData.projectName}
                    onChange={(e) => updateProjectData('projectName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入项目名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目类型
                  </label>
                  <input
                    type="text"
                    value={projectData.projectType}
                    onChange={(e) => updateProjectData('projectType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入项目类型"
                  />
                </div>
              </div>
            </div>

            {/* 位置信息 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">位置信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目地址
                  </label>
                  <input
                    type="text"
                    value={projectData.location}
                    onChange={(e) => updateProjectData('location', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="请输入项目地址"
                  />
                </div>
              </div>
            </div>

            {/* 规模信息 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">规模信息</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    建筑面积 (m²)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={projectData.area}
                    onChange={(e) => updateProjectData('area', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年用电量 (kWh)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={projectData.annualElectricity}
                    onChange={(e) => updateProjectData('annualElectricity', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    峰值负荷 (kW)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={projectData.peakLoad}
                    onChange={(e) => updateProjectData('peakLoad', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={saveProject}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                保存项目
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
