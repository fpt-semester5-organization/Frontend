import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { PATHS, withReturnUrl } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth.store';
import { MyPostsPanel } from '../components/MyPostsPanel';

type ContentTab = 'posts' | 'recipes';

const TABS: { value: ContentTab; label: string; icon: string }[] = [
  { value: 'posts', label: 'Bài viết', icon: 'article' },
  { value: 'recipes', label: 'Công thức', icon: 'menu_book' },
];

const PRIMARY_LINK =
  'inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md text-on-primary no-underline hover:bg-primary';
const SECONDARY_LINK =
  'inline-flex items-center gap-2 rounded-lg bg-surface-container px-5 py-2.5 font-label-md text-label-md text-on-surface no-underline hover:bg-surface-container-high';

/**
 * Nội dung của tôi `/me/content`: gộp "Bài viết của tôi" (SCR-28) và "Công thức của tôi" (SCR-14), thống nhất với Leader 17/10/2026.
 * Tab chọn qua `?tab=recipes`; mặc định là bài viết. Khách thấy lời mời đăng nhập.
 */
const MyContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, sessionStatus } = useAuthStore();
  const tab: ContentTab = searchParams.get('tab') === 'recipes' ? 'recipes' : 'posts';

  if (sessionStatus === 'restoring') return <PageLoader />;

  if (!user) {
    const returnUrl = PATHS.ME.CONTENT(tab);
    return (
      <EmptyState
        icon="edit_note"
        title="Nội dung của tôi"
        description="Đăng nhập để xem và quản lý bài viết, công thức của bạn."
        action={
          <>
            <Link to={withReturnUrl(PATHS.AUTH.LOGIN, returnUrl)} className={PRIMARY_LINK}>
              Đăng nhập
            </Link>
            <Link to={withReturnUrl(PATHS.AUTH.REGISTER, returnUrl)} className={SECONDARY_LINK}>
              Đăng ký
            </Link>
          </>
        }
      />
    );
  }

  // Đổi tab thì bỏ bộ lọc của tab cũ.
  const selectTab = (next: ContentTab) => setSearchParams(next === 'recipes' ? { tab: 'recipes' } : {});

  const writePost = (
    <Button key="post" size="lg" variant={tab === 'posts' ? 'primary' : 'outline'} onClick={() => navigate(PATHS.COMMUNITY.NEW_POST)}>
      <Icon name="edit_note" className="text-[20px]" />
      Viết bài mới
    </Button>
  );
  const writeRecipe = (
    <Button key="recipe" size="lg" variant={tab === 'recipes' ? 'primary' : 'outline'} onClick={() => navigate(PATHS.RECIPES.NEW)}>
      <Icon name="add_circle" className="text-[20px]" />
      Đăng công thức
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-margin-mobile py-space-xl sm:px-margin">
      <div className="mb-space-lg flex flex-col justify-between gap-space-lg md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile tracking-tight text-tertiary sm:text-headline-lg">Nội dung của tôi</h1>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
            Quản lý bài viết và công thức bạn chia sẻ với cộng đồng.
          </p>
        </div>
        <div className="flex flex-wrap gap-space-sm">{tab === 'posts' ? [writePost, writeRecipe] : [writeRecipe, writePost]}</div>
      </div>

      <div role="tablist" aria-label="Loại nội dung" className="mb-space-lg flex gap-2 border-b border-outline-variant">
        {TABS.map((item) => {
          const active = item.value === tab;
          return (
            <button
              key={item.value}
              id={`my-content-tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`my-content-panel-${item.value}`}
              onClick={() => selectTab(item.value)}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-space-md py-space-sm font-label-lg text-label-lg transition-colors',
                active ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name={item.icon} className="text-[20px]" />
              {item.label}
            </button>
          );
        })}
      </div>

      <section id={`my-content-panel-${tab}`} role="tabpanel" aria-labelledby={`my-content-tab-${tab}`}>
        {tab === 'posts' ? (
          <MyPostsPanel userId={user.userId} />
        ) : (
          // UNSPECIFIED (17/10/2026): Backend chưa có API liệt kê công thức của tác giả (gồm DRAFT/PENDING_REVIEW/REJECTED…);
          // GET /recipes chỉ trả APPROVED_ACTIVE và không lọc theo tác giả. Chờ Leader/Backend bổ sung, ví dụ authorId như GET /posts.
          <EmptyState
            icon="menu_book"
            title="Danh sách công thức của bạn đang được phát triển"
            description="Công thức bạn đăng vẫn được lưu và gửi kiểm duyệt; sau khi được duyệt, công thức sẽ hiện trong Kho công thức."
            className="rounded-2xl bg-surface-container-lowest shadow-card"
            action={
              <>
                <Link to={PATHS.RECIPES.NEW} className={PRIMARY_LINK}>
                  Đăng công thức
                </Link>
                <Link to={PATHS.RECIPES.ROOT} className={SECONDARY_LINK}>
                  Xem Kho công thức
                </Link>
              </>
            }
          />
        )}
      </section>
    </div>
  );
};

export default MyContent;
