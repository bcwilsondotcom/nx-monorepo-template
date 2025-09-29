# Web App - Next.js Application

A modern, production-ready web application built with Next.js 14, React 18, and TypeScript, showcasing best practices for frontend development, state management, authentication, and user experience.

## Overview

This web application demonstrates:
- **Next.js 14**: Latest features including App Router, Server Components, and Server Actions
- **React 18**: Modern React with Concurrent Features, Suspense, and hooks
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **State Management**: Zustand for client state, SWR for server state
- **Authentication**: JWT-based authentication with automatic token refresh
- **Performance**: Optimized for Core Web Vitals and accessibility
- **Testing**: Comprehensive testing with Jest, React Testing Library, and Playwright

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- API service running (see [api-example](../api-example/README.md))

### Local Development

```bash
# Install dependencies (from root)
pnpm install

# Start the web application
pnpm nx serve web-app

# Application will be available at http://localhost:3001
```

### Build and Production

```bash
# Build for production
pnpm nx build web-app

# Start production server
pnpm nx start web-app

# Analyze bundle size
ANALYZE=true pnpm nx build web-app
```

## Architecture

### Project Structure

```
apps/web-app/
├── public/                     # Static assets
│   ├── icons/                 # App icons
│   ├── images/                # Images
│   └── favicon.ico
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Auth layout group
│   │   │   ├── login/        # Login page
│   │   │   └── register/     # Registration page
│   │   ├── (dashboard)/      # Dashboard layout group
│   │   │   ├── projects/     # Projects pages
│   │   │   ├── builds/       # Builds pages
│   │   │   └── settings/     # Settings pages
│   │   ├── api/              # API routes (if needed)
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   ├── loading.tsx       # Global loading UI
│   │   ├── not-found.tsx     # 404 page
│   │   └── page.tsx          # Home page
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI components
│   │   ├── forms/           # Form components
│   │   ├── layout/          # Layout components
│   │   └── features/        # Feature-specific components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   ├── services/            # API services
│   ├── store/               # State management
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### Tech Stack

#### Core Framework
- **Next.js 14**: React framework with App Router
- **React 18**: Component library with concurrent features
- **TypeScript**: Type-safe JavaScript

#### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Modules**: Component-scoped styles (when needed)
- **Radix UI**: Headless UI components

#### State Management
- **Zustand**: Lightweight state management
- **SWR**: Data fetching and caching
- **React Hook Form**: Form state management

#### Authentication
- **JWT**: JSON Web Tokens
- **NextAuth.js**: Authentication library (optional)
- **Secure storage**: httpOnly cookies for tokens

#### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **TypeScript**: Static type checking

## Features

### Authentication System

#### Login Flow
```typescript
// src/components/auth/LoginForm.tsx
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          {...register('email', { required: 'Email is required' })}
          type="email"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          {...register('password', { required: 'Password is required' })}
          type="password"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

#### Authentication Hook
```typescript
// src/hooks/useAuth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(email, password);
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshToken: async () => {
        try {
          const response = await authService.refreshToken();
          set({
            token: response.access_token,
          });
        } catch (error) {
          get().logout();
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### Project Management Dashboard

#### Projects List
```typescript
// src/app/(dashboard)/projects/page.tsx
import { Suspense } from 'react';
import { ProjectsList } from '@/components/features/projects/ProjectsList';
import { CreateProjectButton } from '@/components/features/projects/CreateProjectButton';
import { ProjectsFilters } from '@/components/features/projects/ProjectsFilters';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <CreateProjectButton />
      </div>

      <ProjectsFilters />

      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsList />
      </Suspense>
    </div>
  );
}
```

#### Projects List Component
```typescript
// src/components/features/projects/ProjectsList.tsx
'use client';

import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ProjectsList() {
  const { data: projects, error, isLoading } = useProjects();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Error loading projects: {error.message}
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <EmptyState
        title="No projects yet"
        description="Get started by creating your first project."
        action={<CreateProjectButton />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

#### Project Card Component
```typescript
// src/components/features/projects/ProjectCard.tsx
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    active: 'green',
    inactive: 'gray',
    archived: 'red',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
        <Badge color={statusColors[project.status]}>
          {project.status}
        </Badge>
      </div>

      {project.description && (
        <p className="text-gray-600 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>Type: {project.type}</span>
        <span>
          Updated {formatDistanceToNow(new Date(project.updated_at))} ago
        </span>
      </div>

      <div className="flex space-x-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${project.id}`}>
            View Details
          </Link>
        </Button>

        <Button asChild size="sm">
          <Link href={`/projects/${project.id}/builds`}>
            Build
          </Link>
        </Button>
      </div>
    </Card>
  );
}
```

### Build Management

#### Builds List with Real-time Updates
```typescript
// src/components/features/builds/BuildsList.tsx
'use client';

import { useBuilds } from '@/hooks/useBuilds';
import { useBuildUpdates } from '@/hooks/useBuildUpdates';
import { BuildCard } from './BuildCard';

interface BuildsListProps {
  projectId?: string;
}

export function BuildsList({ projectId }: BuildsListProps) {
  const { data: builds, mutate } = useBuilds(projectId);

  // Subscribe to real-time build updates
  useBuildUpdates({
    onUpdate: (buildUpdate) => {
      mutate((currentBuilds) => {
        return currentBuilds?.map((build) =>
          build.id === buildUpdate.id ? { ...build, ...buildUpdate } : build
        );
      }, false);
    },
  });

  return (
    <div className="space-y-4">
      {builds?.map((build) => (
        <BuildCard key={build.id} build={build} />
      ))}
    </div>
  );
}
```

#### Real-time Build Updates Hook
```typescript
// src/hooks/useBuildUpdates.ts
import { useEffect } from 'react';
import { useAuth } from './useAuth';

interface UseBuildUpdatesOptions {
  onUpdate: (build: Build) => void;
}

export function useBuildUpdates({ onUpdate }: UseBuildUpdatesOptions) {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource(
      `/api/builds/stream?token=${token}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      try {
        const buildUpdate = JSON.parse(event.data);
        onUpdate(buildUpdate);
      } catch (error) {
        console.error('Error parsing build update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [token, onUpdate]);
}
```

### Settings and Profile Management

#### User Profile Settings
```typescript
// src/app/(dashboard)/settings/profile/page.tsx
import { ProfileForm } from '@/components/features/settings/ProfileForm';
import { PasswordChangeForm } from '@/components/features/settings/PasswordChangeForm';
import { DeleteAccountSection } from '@/components/features/settings/DeleteAccountSection';

export default function ProfileSettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      <ProfileForm />
      <PasswordChangeForm />
      <DeleteAccountSection />
    </div>
  );
}
```

#### Profile Form with Validation
```typescript
// src/components/features/settings/ProfileForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updatedUser = await userService.updateProfile(data);
      updateUser(updatedUser);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
        type: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <Input
          id="name"
          {...register('name')}
          error={errors.name?.message}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          {...register('bio')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.bio && (
          <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
```

## State Management

### Zustand Store Setup

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { authSlice, AuthSlice } from './auth.slice';
import { uiSlice, UISlice } from './ui.slice';

export interface RootState extends AuthSlice, UISlice {}

export const useStore = create<RootState>()(
  devtools(
    (...args) => ({
      ...authSlice(...args),
      ...uiSlice(...args),
    }),
    { name: 'app-store' }
  )
);
```

### UI State Management
```typescript
// src/store/ui.slice.ts
import { StateCreator } from 'zustand';

export interface UISlice {
  sidebar: {
    isOpen: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
  };
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const uiSlice: StateCreator<UISlice> = (set) => ({
  sidebar: {
    isOpen: false,
    toggle: () =>
      set((state) => ({
        sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen },
      })),
    open: () =>
      set((state) => ({
        sidebar: { ...state.sidebar, isOpen: true },
      })),
    close: () =>
      set((state) => ({
        sidebar: { ...state.sidebar, isOpen: false },
      })),
  },

  theme: 'light',
  setTheme: (theme) => set({ theme }),

  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: crypto.randomUUID() },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
});
```

## Data Fetching with SWR

### API Service Layer
```typescript
// src/services/api.service.ts
import axios, { AxiosInstance } from 'axios';
import { useAuth } from '@/hooks/useAuth';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuth.getState().token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await useAuth.getState().refreshToken();
            const newToken = useAuth.getState().token;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            useAuth.getState().logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

export const apiService = new ApiService();
```

### Custom SWR Hooks
```typescript
// src/hooks/useProjects.ts
import useSWR from 'swr';
import { projectService } from '@/services/project.service';

export function useProjects(filters?: ProjectFilters) {
  return useSWR(
    ['projects', filters],
    () => projectService.getProjects(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );
}

export function useProject(id: string) {
  return useSWR(
    id ? ['projects', id] : null,
    () => projectService.getProject(id),
    {
      revalidateOnFocus: false,
    }
  );
}

export function useCreateProject() {
  const { mutate } = useSWR(['projects']);

  const createProject = async (projectData: CreateProjectData) => {
    const newProject = await projectService.createProject(projectData);

    // Optimistically update the cache
    mutate((projects: Project[] = []) => [newProject, ...projects], false);

    return newProject;
  };

  return { createProject };
}
```

## UI Components

### Design System Components

#### Button Component
```typescript
// src/components/ui/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

#### Input Component
```typescript
// src/components/ui/Input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

### Layout Components

#### Navigation Component
```typescript
// src/components/layout/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Builds', href: '/builds', icon: CogIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon
              className={cn(
                'mr-3 h-5 w-5',
                isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
```

#### Layout with Sidebar
```typescript
// src/components/layout/DashboardLayout.tsx
'use client';

import { useState } from 'react';
import { Navigation } from './Navigation';
import { UserMenu } from './UserMenu';
import { MobileMenuButton } from './MobileMenuButton';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">
              NX Monorepo
            </h1>
          </div>

          <div className="flex-1 p-4">
            <Navigation />
          </div>

          <div className="p-4 border-t border-gray-200">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <h1 className="text-lg font-semibold text-gray-900">
              NX Monorepo
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## Testing

### Testing Setup

```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### Component Testing

```typescript
// src/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });
});
```

### Hook Testing

```typescript
// src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { authService } from '@/services/auth.service';

jest.mock('@/services/auth.service');

describe('useAuth', () => {
  beforeEach(() => {
    useAuth.getState().logout();
  });

  it('should login user successfully', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      access_token: 'mock-token',
    };

    (authService.login as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockResponse.user);
    expect(result.current.token).toBe(mockResponse.access_token);
  });

  it('should handle login error', async () => {
    const error = new Error('Invalid credentials');
    (authService.login as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.login('test@example.com', 'wrongpassword');
      })
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

### E2E Testing with Playwright

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid=welcome-message]')).toContainText(
      'Welcome back'
    );
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'wrongpassword');
    await page.click('[data-testid=login-button]');

    await expect(page.locator('[data-testid=error-message]')).toContainText(
      'Invalid credentials'
    );
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
```

### Running Tests

```bash
# Unit and integration tests
pnpm nx test web-app

# Watch mode
pnpm nx test web-app --watch

# Coverage report
pnpm nx test web-app --coverage

# E2E tests
pnpm nx e2e web-app-e2e

# E2E tests with UI
pnpm nx e2e web-app-e2e --ui

# Visual regression tests
pnpm nx run web-app-e2e:visual-test
```

## Performance Optimization

### Next.js Optimization

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  images: {
    domains: ['images.unsplash.com', 'assets.example.com'],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### Image Optimization

```typescript
// src/components/ui/OptimizedImage.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoadingComplete={() => setIsLoading(false)}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}
```

### Code Splitting and Lazy Loading

```typescript
// src/components/features/projects/ProjectDetails.tsx
import { lazy, Suspense } from 'react';

const BuildsList = lazy(() => import('./BuildsList'));
const ProjectSettings = lazy(() => import('./ProjectSettings'));

export function ProjectDetails({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-8">
      <ProjectOverview projectId={projectId} />

      <Suspense fallback={<BuildsListSkeleton />}>
        <BuildsList projectId={projectId} />
      </Suspense>

      <Suspense fallback={<SettingsSkeleton />}>
        <ProjectSettings projectId={projectId} />
      </Suspense>
    </div>
  );
}
```

## Accessibility

### Accessibility Features

```typescript
// src/components/ui/Dialog.tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-lg font-semibold mb-4">
          {title}
        </h2>

        {children}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close dialog"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body
  );
}
```

### Screen Reader Support

```typescript
// src/components/ui/Toast.tsx
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const roleMap = {
    success: 'status',
    error: 'alert',
    warning: 'alert',
    info: 'status',
  };

  return (
    <div
      role={roleMap[type]}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`toast toast-${type}`}
    >
      <p>{message}</p>
      <button
        onClick={onClose}
        className="toast-close"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
```

## Deployment

### Build Configuration

```bash
# Production build
pnpm nx build web-app

# Analyze bundle size
ANALYZE=true pnpm nx build web-app

# Build with specific environment
NODE_ENV=production pnpm nx build web-app
```

### Docker Deployment

```dockerfile
# apps/web-app/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm install -g pnpm && pnpm nx build web-app

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist/apps/web-app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/dist/apps/web-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/dist/apps/web-app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your-ga-id

# .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.example.com
```

## Security

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googletagmanager.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: *.unsplash.com;
      font-src 'self';
      connect-src 'self' *.example.com wss://*.example.com;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Input Sanitization

```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential script tags
    .slice(0, 1000); // Limit length
}
```

## Troubleshooting

### Common Issues

#### Hydration Mismatch
```typescript
// src/components/ClientOnly.tsx
import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

#### API Connection Issues
```typescript
// src/services/api.service.ts
class ApiService {
  private async handleRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('API server is not available. Please try again later.');
      }
      if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      throw error;
    }
  }
}
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* pnpm nx serve web-app

# Development with source maps
NODE_OPTIONS="--enable-source-maps" pnpm nx serve web-app

# Bundle analyzer
ANALYZE=true pnpm nx build web-app
```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for general guidelines.

### Web App Guidelines

1. **Component Structure**: Follow atomic design principles
2. **TypeScript**: Use strict typing, avoid `any`
3. **Performance**: Optimize for Core Web Vitals
4. **Accessibility**: Follow WCAG 2.1 AA guidelines
5. **Testing**: Write tests for all components and hooks
6. **State Management**: Use appropriate state solution for scope
7. **Error Boundaries**: Implement error boundaries for fault tolerance

---

**Last Updated**: January 15, 2024
**Version**: 1.0.0