import React, { useState } from 'react';
import { Building2, Settings, CreditCard, FileSignature, Receipt } from 'lucide-react';
import CompanyInfoTab from './tabs/CompanyInfoTab.tsx';
import AccountingSettingsTab from './tabs/AccountingSettingsTab.tsx';
import FirmbankingTab from './tabs/FirmbankingTab.tsx';
import SignatureTab from './tabs/SignatureTab.tsx';
import InvoiceTab from './tabs/InvoiceTab.tsx';
import type { ActiveTab } from './types.ts';

const CompanyManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('company-info');

  const tabs = [
    {
      id: 'company-info' as ActiveTab,
      label: 'Thông tin công ty',
      icon: Building2,
    },
    {
      id: 'accounting' as ActiveTab,
      label: 'Thiết lập dữ liệu kế toán',
      icon: Settings,
    },
    {
      id: 'firmbanking' as ActiveTab,
      label: 'Cài đặt Firmbanking',
      icon: CreditCard,
    },
    {
      id: 'signature' as ActiveTab,
      label: 'Cài đặt chữ ký',
      icon: FileSignature,
    },
    {
      id: 'invoice' as ActiveTab,
      label: 'Cài đặt hóa đơn',
      icon: Receipt,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company-info':
        return <CompanyInfoTab />;
      case 'accounting':
        return <AccountingSettingsTab />;
      case 'firmbanking':
        return <FirmbankingTab />;
      case 'signature':
        return <SignatureTab />;
      case 'invoice':
        return <InvoiceTab />;
      default:
        return <CompanyInfoTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Quản lý Công ty</h1>
            <p className="mt-2 text-sm text-gray-600">
              Quản lý thông tin và cài đặt tổng thể cho công ty
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white w-full border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 rounded-lg">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;