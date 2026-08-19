import React from 'react';
import { PRODUCT_IDENTITY } from '../config/productIdentity';

const AboutSoftware: React.FC = () => (
  <section className="h-full overflow-y-auto bg-slate-50 p-8">
    <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-10 py-12 text-white">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <span className="material-symbols-outlined text-3xl">eco</span>
        </div>
        <p className="mb-2 text-sm font-semibold tracking-[0.24em] text-indigo-100">关于软件</p>
        <h1 className="text-3xl font-bold leading-tight">{PRODUCT_IDENTITY.fullName}</h1>
        <p className="mt-3 text-lg text-indigo-100">{PRODUCT_IDENTITY.shortName} · {PRODUCT_IDENTITY.version}</p>
      </div>

      <div className="space-y-8 px-10 py-10">
        <p className="leading-7 text-slate-600">
          本软件用于园区综合能源项目的基础数据管理、节能改造方案测算、投资收益分析、方案比较与报告输出，
          为项目投资决策和方案沟通提供辅助依据。
        </p>

        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ['软件全称', PRODUCT_IDENTITY.fullName],
            ['软件简称', PRODUCT_IDENTITY.shortName],
            ['版本号', PRODUCT_IDENTITY.version],
            ['开发完成年份', PRODUCT_IDENTITY.developmentYear],
            ['版权主体', PRODUCT_IDENTITY.copyrightHolder],
            ['版本用途', '软件著作权申请冻结版'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <dt className="text-xs font-semibold text-slate-400">{label}</dt>
              <dd className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          测算结果受输入数据、价格参数和模型假设影响，仅用于项目分析与辅助决策，不构成投资、融资或交易承诺。
        </div>

        <p className="text-center text-xs text-slate-400">
          © {PRODUCT_IDENTITY.developmentYear} {PRODUCT_IDENTITY.copyrightHolder}
        </p>
      </div>
    </div>
  </section>
);

export default AboutSoftware;
