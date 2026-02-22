import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

export interface Slide {
  id: string;
  presentation_id: string;
  title: string;
  html_content: string;
  slide_order: number;
  created_at: string;
  updated_at: string;
}

export interface PresentationShare {
  id: string;
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

  // Reorder slides
  async reorderSlides(slides: { id: string; slide_order: number }[]) {
    try {
      // Execute updates sequentially to avoid conflicts
      for (const slide of slides) {
        const { error } = await supabase
          .from('slides')
          .update({ slide_order: slide.slide_order })
          .eq('id', slide.id);
        
        if (error) {
          console.error('Error updating slide order:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in reorderSlides:', error);
      throw error;
    }
  }
};
