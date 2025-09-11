import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, List, Avatar, Space, App, Popconfirm } from 'antd';
import { PlusOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../src/firebase'; // Adjusted path to firebase.ts

type ResourceLink = {
  id?: string;
  url: string;
  userTitle?: string;
  pageTitle?: string;
  faviconUrl?: string;
  createdAt?: any;
  updatedAt?: any;
};

function toFavicon(url: string) {
  try {
    const u = new URL(url);
    return `${u.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

function toHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function UsefulDocsDrawer() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Load realtime list
  useEffect(() => {
    const q = query(collection(db, 'usefulLinks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: ResourceLink[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<ResourceLink, 'id'>) }));
      setLinks(items);
    });
    return () => unsub();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const displayTitle = (item: ResourceLink) =>
    item.userTitle?.trim() ||
    item.pageTitle?.trim() ||
    toHostname(item.url);

  const onAdd = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const url: string = values.url.trim();
      const userTitle: string | undefined = values.title?.trim() || undefined;

      // basic URL check
      // Form already validates, but double-check:
      new URL(url);

      const docData: Omit<ResourceLink, 'id'> = {
        url,
        userTitle,
        pageTitle: '', // (optional) fill later via backend if needed
        faviconUrl: toFavicon(url),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'usefulLinks'), docData);
      form.resetFields();
      message.success('Đã thêm liên kết');
    } catch (err: any) {
      message.error(err?.message || 'Không thể thêm liên kết');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'usefulLinks', id));
      message.success('Đã xoá');
    } catch (err: any) {
      message.error(err?.message || 'Không thể xoá');
    }
  };

  // Green primary-style button
  const greenBtnStyle: React.CSSProperties = {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  };

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        className="ant-btn css-1v5z42l ant-btn-primary ant-btn-color-primary ant-btn-variant-solid"
        style={greenBtnStyle}
        onClick={handleOpen}
      >
        Tài liệu thường dùng
      </Button>

      <Drawer
        title="Tài liệu thường dùng"
        placement="right"
        width="33vw"
        open={open}
        onClose={handleClose}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Link (URL)"
            name="url"
            rules={[
              { required: true, message: 'Vui lòng nhập URL' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    new URL(String(value));
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('URL không hợp lệ'));
                  }
                },
              },
            ]}
          >
            <Input placeholder="https://example.com/tai-lieu" prefix={<LinkOutlined />} />
          </Form.Item>

          <Form.Item
            label="Tiêu đề (tuỳ chọn)"
            name="title"
          >
            <Input placeholder="VD: Quy trình xử lý đơn Shopee" />
          </Form.Item>

          <Space>
            <Button type="primary" onClick={onAdd} loading={loading}>
              Thêm liên kết
            </Button>
            <Button onClick={() => form.resetFields()}>Xoá nhập</Button>
          </Space>
        </Form>

        <div style={{ marginTop: 24 }} />

        <List
          itemLayout="horizontal"
          dataSource={links}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title="Xoá liên kết?"
                  okText="Xoá"
                  cancelText="Huỷ"
                  onConfirm={() => onDelete(item.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={item.faviconUrl} shape="square" />}
                title={
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {displayTitle(item)}
                  </a>
                }
                description={item.url}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}
