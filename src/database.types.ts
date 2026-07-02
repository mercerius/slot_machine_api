export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      spins: {
        Row: {
          bet_amount: number;
          combination: string | null;
          created_at: string;
          id: string;
          ip_hash: string | null;
          is_win: boolean;
          match_type: string;
          net_result: number | null;
          reel_1: string;
          reel_2: string;
          reel_3: string;
          spin_id: string;
          win_amount: number;
        };
        Insert: {
          bet_amount: number;
          combination?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          is_win: boolean;
          match_type?: string;
          net_result?: number | null;
          reel_1: string;
          reel_2: string;
          reel_3: string;
          spin_id: string;
          win_amount?: number;
        };
        Update: {
          bet_amount?: number;
          combination?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          is_win?: boolean;
          match_type?: string;
          net_result?: number | null;
          reel_1?: string;
          reel_2?: string;
          reel_3?: string;
          spin_id?: string;
          win_amount?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
