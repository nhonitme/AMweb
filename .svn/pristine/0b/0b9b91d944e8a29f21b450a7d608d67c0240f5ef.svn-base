import React, { useState } from 'react';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText, 
  Video, 
  Download, 
  Users, 
  Settings, 
  Calculator, 
  Receipt, 
  HelpCircle, 
  ChevronRight, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Shield,
  TrendingUp,
  Globe,
  Headphones,
  MessageSquare,
  BookOpen,
  PlayCircle,
  FileDown,
  ExternalLink
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articleCount: number;
  color: string;
}

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  views: number;
  rating: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

const categories: Category[] = [
  {
    id: 'getting-started',
    title: 'Hướng dẫn bắt đầu',
    description: 'Thiết lập tài khoản và làm quen với phần mềm',
    icon: <Zap className="text-blue-600" size={24} />,
    articleCount: 12,
    color: 'bg-blue-50 border-blue-200'
  },
  {
    id: 'accounting',
    title: 'Nghiệp vụ kế toán',
    description: 'Hướng dẫn các chức năng kế toán cơ bản và nâng cao',
    icon: <Calculator className="text-green-600" size={24} />,
    articleCount: 28,
    color: 'bg-green-50 border-green-200'
  },
  {
    id: 'reports',
    title: 'Báo cáo tài chính',
    description: 'Tạo và quản lý các loại báo cáo tài chính',
    icon: <TrendingUp className="text-purple-600" size={24} />,
    articleCount: 15,
    color: 'bg-purple-50 border-purple-200'
  },
  {
    id: 'tax',
    title: 'Thuế & Pháp lý',
    description: 'Quy định thuế và tuân thủ pháp luật',
    icon: <Receipt className="text-amber-600" size={24} />,
    articleCount: 20,
    color: 'bg-amber-50 border-amber-200'
  },
  {
    id: 'security',
    title: 'Bảo mật & Quyền hạn',
    description: 'Quản lý tài khoản và bảo mật dữ liệu',
    icon: <Shield className="text-red-600" size={24} />,
    articleCount: 8,
    color: 'bg-red-50 border-red-200'
  },
  {
    id: 'technical',
    title: 'Hỗ trợ kỹ thuật',
    description: 'Khắc phục sự cố và tối ưu hóa hiệu suất',
    icon: <Settings className="text-gray-600" size={24} />,
    articleCount: 18,
    color: 'bg-gray-50 border-gray-200'
  }
];

const popularArticles: Article[] = [
  {
    id: '1',
    title: 'Cách thiết lập hệ thống tài khoản kế toán',
    description: 'Hướng dẫn chi tiết thiết lập danh mục tài khoản theo thông tư 200',
    category: 'accounting',
    readTime: '8 phút',
    views: 2847,
    rating: 4.8
  },
  {
    id: '2',
    title: 'Lập báo cáo tài chính cuối năm',
    description: 'Quy trình lập báo cáo tài chính năm và các lưu ý quan trọng',
    category: 'reports',
    readTime: '12 phút',
    views: 1923,
    rating: 4.9
  },
  {
    id: '3',
    title: 'Khai báo thuế VAT điện tử',
    description: 'Hướng dẫn khai báo và nộp thuế VAT qua hệ thống điện tử',
    category: 'tax',
    readTime: '6 phút',
    views: 3156,
    rating: 4.7
  },
  {
    id: '4',
    title: 'Phân quyền người dùng trong hệ thống',
    description: 'Cách thiết lập và quản lý quyền truy cập cho từng nhân viên',
    category: 'security',
    readTime: '5 phút',
    views: 1456,
    rating: 4.6
  }
];

const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'Làm thế nào để sao lưu dữ liệu kế toán?',
    answer: 'Bạn có thể sao lưu dữ liệu bằng cách vào menu Hệ thống > Sao lưu dữ liệu. Hệ thống sẽ tự động tạo file backup với định dạng .bak. Khuyến nghị sao lưu hàng ngày và lưu trữ ở nhiều vị trí khác nhau.',
    category: 'technical',
    helpful: 45,
    notHelpful: 3
  },
  {
    id: '2',
    question: 'Tôi có thể nhập dữ liệu từ Excel không?',
    answer: 'Có, AMnote hỗ trợ nhập dữ liệu từ file Excel. Vào menu Dữ liệu > Nhập từ Excel, chọn file và làm theo hướng dẫn. Đảm bảo file Excel có định dạng đúng theo mẫu của hệ thống.',
    category: 'getting-started',
    helpful: 67,
    notHelpful: 5
  },
  {
    id: '3',
    question: 'Làm sao để tạo báo cáo tùy chỉnh?',
    answer: 'Vào menu Báo cáo > Tạo báo cáo tùy chỉnh. Chọn các trường dữ liệu cần thiết, thiết lập điều kiện lọc và định dạng hiển thị. Bạn có thể lưu mẫu báo cáo để sử dụng lại.',
    category: 'reports',
    helpful: 89,
    notHelpful: 7
  }
];

const supportTickets: SupportTicket[] = [
  {
    id: 'TK001',
    subject: 'Lỗi không thể in báo cáo',
    status: 'open',
    priority: 'high',
    createdAt: '2024-12-25 09:30'
  },
  {
    id: 'TK002',
    subject: 'Hướng dẫn thiết lập thuế GTGT',
    status: 'resolved',
    priority: 'medium',
    createdAt: '2024-12-24 14:15'
  }
];

export default function HelpSupportPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: '',
    email: '',
    phone: ''
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle ticket submission
    console.log('Ticket submitted:', ticketForm);
    setShowTicketForm(false);
    setTicketForm({
      subject: '',
      category: '',
      priority: 'medium',
      description: '',
      email: '',
      phone: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Trung tâm Trợ giúp & Hỗ trợ</h1>
          <p className="text-blue-100 text-lg mb-8">
            Tìm câu trả lời nhanh chóng cho mọi thắc mắc về phần mềm kế toán AMnote
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hướng dẫn, FAQ, hoặc nhập từ khóa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-gray-900 bg-white rounded-lg shadow-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="text-2xl font-bold">150+</div>
              <div className="text-blue-100">Bài viết hướng dẫn</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-blue-100">Hỗ trợ trực tuyến</div>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-blue-100">Độ hài lòng khách hàng</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setShowChatWidget(true)}
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="text-green-600" size={20} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Chat trực tiếp</div>
            <div className="text-sm text-gray-500">Hỗ trợ ngay lập tức</div>
          </div>
        </button>

        <button
          onClick={() => setShowTicketForm(true)}
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="text-blue-600" size={20} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Gửi yêu cầu</div>
            <div className="text-sm text-gray-500">Tạo ticket hỗ trợ</div>
          </div>
        </button>

        <a
          href="tel:1900-1234"
          className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Phone className="text-red-600" size={20} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Hotline</div>
            <div className="text-sm text-gray-500">1900-1234</div>
          </div>
        </a>

        <button className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Video className="text-purple-600" size={20} />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Video hướng dẫn</div>
            <div className="text-sm text-gray-500">Học qua video</div>
          </div>
        </button>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Danh mục hỗ trợ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`p-4 border-2 rounded-lg hover:shadow-md transition-all cursor-pointer ${category.color}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{category.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{category.articleCount} bài viết</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Bài viết phổ biến</h2>
          <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
            Xem tất cả
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularArticles.map((article) => (
            <div
              key={article.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 line-clamp-2">{article.title}</h3>
                <div className="flex items-center space-x-1 text-amber-500 ml-2">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs text-gray-600">{article.rating}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {article.readTime}
                  </span>
                  <span>{article.views.toLocaleString()} lượt xem</span>
                </div>
                <ExternalLink size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Câu hỏi thường gặp</h2>
        <div className="space-y-4">
          {faqItems.map((faq) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronRight
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    expandedFAQ === faq.id ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedFAQ === faq.id && (
                <div className="px-4 pb-4">
                  <p className="text-gray-600 mb-4">{faq.answer}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">Bài viết này có hữu ích không?</span>
                      <div className="flex items-center space-x-2">
                        <button className="flex items-center space-x-1 text-green-600 hover:text-green-700">
                          <ThumbsUp size={14} />
                          <span className="text-sm">{faq.helpful}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-red-600 hover:text-red-700">
                          <ThumbsDown size={14} />
                          <span className="text-sm">{faq.notHelpful}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Resources Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <PlayCircle className="text-blue-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Video hướng dẫn</h3>
          </div>
          <p className="text-gray-600 mb-4">Học cách sử dụng phần mềm qua video chi tiết</p>
          <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
            Xem video
            <ExternalLink size={14} className="ml-1" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileDown className="text-green-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Tài liệu tải về</h3>
          </div>
          <p className="text-gray-600 mb-4">Biểu mẫu, hướng dẫn PDF và tài liệu tham khảo</p>
          <button className="text-green-600 hover:text-green-700 font-medium flex items-center">
            Tải xuống
            <Download size={14} className="ml-1" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Cộng đồng</h3>
          </div>
          <p className="text-gray-600 mb-4">Tham gia thảo luận với cộng đồng người dùng</p>
          <button className="text-purple-600 hover:text-purple-700 font-medium flex items-center">
            Tham gia
            <ExternalLink size={14} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Yêu cầu hỗ trợ của bạn</h2>
          <button
            onClick={() => setShowTicketForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Mail size={16} />
            <span>Tạo yêu cầu mới</span>
          </button>
        </div>
        
        {supportTickets.length > 0 ? (
          <div className="space-y-3">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="font-medium text-gray-900">#{ticket.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status === 'open' ? 'Đang xử lý' : 
                       ticket.status === 'pending' ? 'Chờ phản hồi' : 'Đã giải quyết'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority === 'high' ? 'Cao' : 
                       ticket.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{ticket.subject}</h4>
                  <p className="text-sm text-gray-500">Tạo lúc: {ticket.createdAt}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Bạn chưa có yêu cầu hỗ trợ nào</p>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Liên hệ trực tiếp</h2>
          <p className="text-gray-600">Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ bạn</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Phone className="text-blue-600" size={24} />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Hotline</h3>
            <p className="text-gray-600 text-sm mb-2">Hỗ trợ 24/7</p>
            <a href="tel:1900-1234" className="text-blue-600 hover:text-blue-700 font-medium">
              1900-1234
            </a>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Mail className="text-green-600" size={24} />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Email</h3>
            <p className="text-gray-600 text-sm mb-2">Phản hồi trong 2 giờ</p>
            <a href="mailto:support@amnote.vn" className="text-green-600 hover:text-green-700 font-medium">
              support@amnote.vn
            </a>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="text-purple-600" size={24} />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Live Chat</h3>
            <p className="text-gray-600 text-sm mb-2">Trực tuyến 8:00-22:00</p>
            <button
              onClick={() => setShowChatWidget(true)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Bắt đầu chat
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Form Modal */}
      {showTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Tạo yêu cầu hỗ trợ</h3>
              <button
                onClick={() => setShowTicketForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AlertCircle size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleTicketSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mô tả ngắn gọn vấn đề"
                  />
                </div>
                
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Chọn danh mục</option>
                    <option value="technical">Hỗ trợ kỹ thuật</option>
                    <option value="accounting">Nghiệp vụ kế toán</option>
                    <option value="reports">Báo cáo</option>
                    <option value="tax">Thuế</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Độ ưu tiên
                  </label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
                
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Email liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={ticketForm.email}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={ticketForm.phone}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0123456789"
                />
              </div>
              
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTicketForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Send size={16} />
                  <span>Gửi yêu cầu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {showChatWidget && (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Headphones size={20} />
              <span className="font-medium">Hỗ trợ trực tuyến</span>
            </div>
            <button
              onClick={() => setShowChatWidget(false)}
              className="p-1 hover:bg-blue-700 rounded"
            >
              <AlertCircle size={16} />
            </button>
          </div>
          
          <div className="p-4 h-64 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Headphones size={14} className="text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
