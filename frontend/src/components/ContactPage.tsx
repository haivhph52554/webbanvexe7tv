import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle
} from 'lucide-react';

type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

type Errors = Partial<FormData>;

const ContactPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  /* ================= VALIDATE ================= */
  const validate = () => {
    const err: Errors = {};

    if (!formData.name.trim()) err.name = 'Vui lòng nhập họ tên';

    if (!formData.email.trim()) {
      err.email = 'Vui lòng nhập email';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      err.email = 'Email không đúng định dạng';
    }

    if (!formData.phone.trim()) {
      err.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)[0-9]{9}$/.test(formData.phone)) {
      err.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.subject) err.subject = 'Vui lòng chọn chủ đề';
    if (!formData.message.trim()) err.message = 'Vui lòng nhập nội dung';

    return err;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setErrors(err);

    if (Object.keys(err).length === 0) {
      setSubmitted(true);
      console.log('FORM DATA:', formData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* BACK */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-blue-600 mb-6"
      >
        <ArrowLeft size={18} /> Quay lại
      </button>

      {/* HEADER */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Liên hệ với chúng tôi
        </h2>
        <p className="text-gray-600">
          Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7
        </p>
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ================= LEFT ================= */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold mb-6">Thông tin liên hệ</h3>

            <div className="space-y-6">
              <InfoItem icon={<Phone />} color="blue" title="Hotline" desc="1900 6886" sub="Hỗ trợ 24/7" />
              <InfoItem icon={<Mail />} color="green" title="Email" desc="vexe7tv@gmail.com" sub="Phản hồi trong 24h" />
              <InfoItem
                icon={<MapPin />}
                color="purple"
                title="Địa chỉ"
                desc="123 Trịnh Văn Bô, Nam Từ Liêm, Hà Nội"
                sub="Trụ sở chính"
              />
              <InfoItem
                icon={<Clock />}
                color="orange"
                title="Giờ làm việc"
                desc="Thứ 2 - Thứ 6: 8:00 - 18:00"
                sub="Hotline 24/7"
              />
            </div>
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold mb-6">Gửi yêu cầu hỗ trợ</h3>

          {submitted ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle /> Gửi liên hệ thành công!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="name" placeholder="Họ và tên" value={formData.name} onChange={handleChange} error={errors.name} />
              <Input name="email" placeholder="Email" value={formData.email} onChange={handleChange} error={errors.email} />
              <Input name="phone" placeholder="Số điện thoại" value={formData.phone} onChange={handleChange} error={errors.phone} />

              <Select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                error={errors.subject}
              />

              <Textarea
                name="message"
                placeholder="Nội dung"
                value={formData.message}
                onChange={handleChange}
                error={errors.message}
              />

              <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700">
                <Send size={18} /> Gửi liên hệ
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ================= FAQ ================= */}
      <div className="bg-white rounded-xl shadow-md p-6 mt-12">
        <h3 className="text-xl font-bold mb-6">Câu hỏi thường gặp</h3>

        <div className="space-y-4">
          <FAQ color="blue" q="Làm thế nào để đặt vé?" a="Chọn tuyến đường, ghế, nhập thông tin và thanh toán." />
          <FAQ color="green" q="Có thể hủy vé không?" a="Có thể hủy trước giờ khởi hành 2 tiếng." />
          <FAQ color="purple" q="Thanh toán như thế nào?" a="MoMo, chuyển khoản, thanh toán tại xe." />
          <FAQ color="orange" q="Có hỗ trợ hoàn tiền không?" a="Có theo điều khoản dịch vụ." />
        </div>
      </div>
    </div>
  );
};

/* ================= COMPONENT PHỤ ================= */
const InfoItem = ({ icon, color, title, desc, sub }: any) => (
  <div className="flex items-start">
    <div className={`bg-${color}-100 p-3 rounded-lg mr-4 text-${color}-600`}>
      {icon}
    </div>
    <div>
      <h4 className="font-semibold">{title}</h4>
      <p>{desc}</p>
      <p className="text-sm text-gray-500">{sub}</p>
    </div>
  </div>
);

const Input = ({ error, ...props }: any) => (
  <div>
    <input {...props} className={`w-full border px-3 py-2 rounded ${error && 'border-red-500'}`} />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

const Select = ({ error, ...props }: any) => (
  <div>
    <select {...props} className={`w-full border px-3 py-2 rounded ${error && 'border-red-500'}`}>
      <option value="">Chọn chủ đề</option>
      <option value="booking">Đặt vé</option>
      <option value="cancel">Hủy vé</option>
      <option value="refund">Hoàn tiền</option>
      <option value="other">Khác</option>
    </select>
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

const Textarea = ({ error, ...props }: any) => (
  <div>
    <textarea {...props} rows={4} className={`w-full border px-3 py-2 rounded ${error && 'border-red-500'}`} />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

const FAQ = ({ color, q, a }: any) => (
  <div className={`border-l-4 border-${color}-500 pl-4`}>
    <h4 className="font-semibold">{q}</h4>
    <p className="text-sm text-gray-600">{a}</p>
  </div>
);

export default ContactPage;
