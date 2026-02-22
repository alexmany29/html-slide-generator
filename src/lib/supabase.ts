import { createClient } from '@supabase/supabase-js';
import type { DbSlide } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Re-export DbSlide as Slide for backward compat in service layer
export type Slide = DbSlide;

export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

export interface PresentationShare {
  presentation_id: string;
  shared_with_user_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
}

// Database functions
export const presentationService = {
  // Get all presentations for current user
  async getUserPresentations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPresentationById(id: string): Promise<Presentation | null> {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Error fetching presentation by id:', error);
      return null;
    }
    return data;
  },

  // Get shared presentations (usando presentation_shares)
  async getSharedPresentations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Buscar todas las presentaciones que tienen un registro en presentation_shares con este usuario
    const { data: shares, error: sharesError } = await supabase
      .from('presentation_shares')
      .select('presentation_id')
      .eq('shared_with_user_id', user.id);
    if (sharesError) throw sharesError;
    if (!shares || shares.length === 0) return [];
    const presentationIds = shares.map(s => s.presentation_id);

    // Obtener las presentaciones completas
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .in('id', presentationIds)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get public presentations
  async getPublicPresentations() {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Create new presentation
  async createPresentation(title: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create presentation
    const { data: presentation, error: presentationError } = await supabase
      .from('presentations')
      .insert({
        title,
        description,
        user_id: user.id
      })
      .select()
      .single();
    
    if (presentationError) throw presentationError;

    // Create initial slide
    const { error: slideError } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentation.id,
        title: 'Slide 1',
        html_content: '<div class="slide-content"><h1>Nueva Slide</h1><p>Haz clic en "Editar HTML" para personalizar esta slide.</p></div>'
      });
    
    if (slideError) throw slideError;
    
    return presentation as Presentation;
  },

  // Update presentation
  async updatePresentation(id: string, updates: Partial<Presentation>) {
    const { data, error } = await supabase
      .from('presentations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Presentation;
  },

  // Delete presentation
  async deletePresentation(id: string) {
    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Check if user can edit a presentation
  async canEditPresentation(presentationId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user owns the presentation
    const { data: presentation } = await supabase
      .from('presentations')
      .select('user_id')
      .eq('id', presentationId)
      .single();
    
    if (presentation?.user_id === user.id) return true;

    // Check if user has edit permissions
    const { data: share } = await supabase
      .from('presentation_shares')
      .select('permission_level')
      .eq('presentation_id', presentationId)
      .eq('shared_with_user_id', user.id)
      .single();
    
    return share?.permission_level === 'edit';
  },

  // Share presentation with users (usando la tabla profiles)
  async sharePresentation(presentationId: string, userEmails: string[], permissionLevel: 'view' | 'edit' = 'view') {
    const normalizedEmails = userEmails.map(e => e.trim().toLowerCase()).filter(e => e);
    if (normalizedEmails.length === 0) {
      return { sharedWith: [], notFound: [] };
    }

    // 1. Buscar los perfiles de usuario por email
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', normalizedEmails);

    if (profilesError) throw profilesError;

    const foundEmails = profiles.map(p => p.email);
    const notFoundEmails = normalizedEmails.filter(email => !foundEmails.includes(email));

    if (profiles.length === 0) {
      return { sharedWith: [], notFound: notFoundEmails };
    }

    // 2. Preparar los registros para insertar en presentation_shares
    const inserts = profiles.map(profile => ({
      presentation_id: presentationId,
      shared_with_user_id: profile.id,
      permission_level: permissionLevel,
    }));

    // 3. Insertar los registros
    const { error: shareError } = await supabase
      .from('presentation_shares')
      .upsert(inserts, { onConflict: 'presentation_id,shared_with_user_id' });

    if (shareError) throw shareError;

    return { sharedWith: profiles.map(p => p.email), notFound: notFoundEmails };
  }
};

// Share link types and service
export interface ShareLink {
  id: string;
  token: string;
  presentation_id: string;
  slide_id: string | null;
  created_by: string;
  title: string | null;
  is_active: boolean;
  password: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

function generateToken(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let token = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

export const shareLinkService = {
  // Create a share link for a presentation or specific slide
  async createShareLink(presentationId: string, slideId?: string, title?: string, expiresAt?: string): Promise<ShareLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const token = generateToken(16);

    const { data, error } = await supabase
      .from('share_links')
      .insert({
        token,
        presentation_id: presentationId,
        slide_id: slideId || null,
        created_by: user.id,
        title: title || null,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ShareLink;
  },

  // Get all share links for a presentation
  async getShareLinks(presentationId: string): Promise<ShareLink[]> {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Toggle active state
  async toggleShareLink(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('share_links')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // Delete a share link
  async deleteShareLink(id: string): Promise<void> {
    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // PUBLIC: Resolve a share link by token (no auth required)
  // Uses SECURITY DEFINER RPC to bypass RLS for unauthenticated access
  async resolveShareLink(token: string): Promise<{
    shareLink: ShareLink;
    presentation: Presentation;
    slides: Slide[];
  } | null> {
    const { data, error } = await supabase.rpc('resolve_share_link', {
      link_token: token,
    });

    if (error || !data) return null;

    return {
      shareLink: data.share_link as ShareLink,
      presentation: data.presentation as Presentation,
      slides: (data.slides || []) as Slide[],
    };
  },
};

export const slideService = {
  // Get slides for a presentation
  async getSlides(presentationId: string) {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('slide_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Create new slide
  async createSlide(presentationId: string, title: string = 'Untitled Slide') {
    // Get the next slide order
    const { data: slides } = await supabase
      .from('slides')
      .select('slide_order')
      .eq('presentation_id', presentationId)
      .order('slide_order', { ascending: false })
      .limit(1);
    
    const nextOrder = slides && slides.length > 0 ? slides[0].slide_order + 1 : 0;

    const { data, error } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        title,
        slide_order: nextOrder
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Slide;
  },

  // Update slide
  async updateSlide(id: string, updates: Partial<Slide>) {
    const { data, error } = await supabase
      .from('slides')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Slide;
  },

  // Delete slide
  async deleteSlide(id: string) {
    const { error } = await supabase
      .from('slides')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Reorder slides using batch RPC
  async reorderSlides(slides: { id: string; slide_order: number }[]) {
    const { error } = await supabase.rpc('batch_reorder_slides', {
      slide_ids: slides.map(s => s.id),
      slide_orders: slides.map(s => s.slide_order),
    });
    if (error) throw error;
  }
};
