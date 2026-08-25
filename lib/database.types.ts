// Tipos enfocados solo en las tablas del corresponsal (prefijo corr_).
// El proyecto Supabase es compartido con el taller; aqui solo modelamos lo nuestro.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      corr_profiles: {
        Row: { id: string; nombre: string; rol: string; activo: boolean; created_at: string };
        Insert: { id: string; nombre: string; rol?: string; activo?: boolean; created_at?: string };
        Update: { id?: string; nombre?: string; rol?: string; activo?: boolean; created_at?: string };
        Relationships: [];
      };
      corr_consignaciones_luis: {
        Row: { id: string; fecha: string; monto: number; hora: string | null; nota: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; fecha?: string; monto: number; hora?: string | null; nota?: string | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; fecha?: string; monto?: number; hora?: string | null; nota?: string | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_compensaciones_luis: {
        Row: { id: string; fecha: string; monto: number; hora: string | null; nota: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; fecha?: string; monto: number; hora?: string | null; nota?: string | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; fecha?: string; monto?: number; hora?: string | null; nota?: string | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_cuadres: {
        Row: {
          id: string; fecha: string; total_tirilla: number; efectivo_consignaciones: number;
          retiros_cash: number; nequis: number; bancolombia: number; recaudos: number; prestamos_consignaciones: number; ret_real: number;
          compensado: number; sr_luis: number; saldo_final: number; saldo_luis_cierre: number;
          fondo_caja: number; efectivo_contado: number;
          estado: string; nota: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; fecha: string; total_tirilla?: number; efectivo_consignaciones?: number;
          retiros_cash?: number; nequis?: number; bancolombia?: number; recaudos?: number; prestamos_consignaciones?: number; ret_real?: number;
          compensado?: number; sr_luis?: number; saldo_final?: number; saldo_luis_cierre?: number;
          fondo_caja?: number; efectivo_contado?: number;
          estado?: string; nota?: string | null; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; fecha?: string; total_tirilla?: number; efectivo_consignaciones?: number;
          retiros_cash?: number; nequis?: number; bancolombia?: number; recaudos?: number; prestamos_consignaciones?: number; ret_real?: number;
          compensado?: number; sr_luis?: number; saldo_final?: number; saldo_luis_cierre?: number;
          fondo_caja?: number; efectivo_contado?: number;
          estado?: string; nota?: string | null; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      corr_deudas: {
        Row: { id: string; persona: string; monto: number; concepto: string | null; descripcion: string | null; medio: string; fecha: string; created_by: string | null; created_at: string };
        Insert: { id?: string; persona: string; monto: number; concepto?: string | null; descripcion?: string | null; medio?: string; fecha?: string; created_by?: string | null; created_at?: string };
        Update: { id?: string; persona?: string; monto?: number; concepto?: string | null; descripcion?: string | null; medio?: string; fecha?: string; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_abonos: {
        Row: { id: string; deuda_id: string; monto: number; fecha: string; nota: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; deuda_id: string; monto: number; fecha?: string; nota?: string | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; deuda_id?: string; monto?: number; fecha?: string; nota?: string | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_soportes: {
        Row: { id: string; fecha: string; tipo: string; contexto: string; path: string; nombre: string | null; mime: string | null; tamano: number | null; created_by: string | null; created_at: string };
        Insert: { id?: string; fecha: string; tipo?: string; contexto?: string; path: string; nombre?: string | null; mime?: string | null; tamano?: number | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; fecha?: string; tipo?: string; contexto?: string; path?: string; nombre?: string | null; mime?: string | null; tamano?: number | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_general: {
        Row: { id: string; fecha: string; saldo_luis: number; saldo_cristian: number; cupo_disponible: number; efectivo: number; nequis: number; monedas: number; deudas_terceros: number; nota: string | null; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; fecha: string; saldo_luis?: number; saldo_cristian?: number; cupo_disponible?: number; efectivo?: number; nequis?: number; monedas?: number; deudas_terceros?: number; nota?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; fecha?: string; saldo_luis?: number; saldo_cristian?: number; cupo_disponible?: number; efectivo?: number; nequis?: number; monedas?: number; deudas_terceros?: number; nota?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      corr_mov_propios: {
        Row: { id: string; fecha: string; tipo: string; monto: number; nota: string | null; soporte_path: string | null; soporte_nombre: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; fecha?: string; tipo: string; monto: number; nota?: string | null; soporte_path?: string | null; soporte_nombre?: string | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; fecha?: string; tipo?: string; monto?: number; nota?: string | null; soporte_path?: string | null; soporte_nombre?: string | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_movimientos: {
        Row: { id: string; fecha: string; tipo: string; monto: number; hora: string | null; cliente: string | null; convenio: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; fecha?: string; tipo: string; monto: number; hora?: string | null; cliente?: string | null; convenio?: string | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; fecha?: string; tipo?: string; monto?: number; hora?: string | null; cliente?: string | null; convenio?: string | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      corr_audit_log: {
        Row: { id: string; tabla: string; accion: string; registro_id: string | null; fecha_dato: string | null; actor_id: string | null; antes: Json | null; despues: Json | null; created_at: string };
        Insert: { id?: string; tabla: string; accion: string; registro_id?: string | null; fecha_dato?: string | null; actor_id?: string | null; antes?: Json | null; despues?: Json | null; created_at?: string };
        Update: { id?: string; tabla?: string; accion?: string; registro_id?: string | null; fecha_dato?: string | null; actor_id?: string | null; antes?: Json | null; despues?: Json | null; created_at?: string };
        Relationships: [];
      };
      corr_push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth_key: string; created_at: string };
        Insert: { id?: string; user_id: string; endpoint: string; p256dh: string; auth_key: string; created_at?: string };
        Update: { id?: string; user_id?: string; endpoint?: string; p256dh?: string; auth_key?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      corr_is_admin: { Args: Record<string, never>; Returns: boolean };
      corr_my_role: { Args: Record<string, never>; Returns: string };
      corr_cron_targets: { Args: { p_secret: string }; Returns: Json };
      corr_cron_delete_sub: { Args: { p_secret: string; p_endpoint: string }; Returns: undefined };
      corr_header_resumen: {
        Args: Record<string, never>;
        Returns: { prestamos_total: number; prestamos_count: number; personas: string[] };
      };
      corr_saldo_luis: { Args: { p_hasta: string; p_incluir: boolean }; Returns: number };
      corr_luis_historial: {
        Args: Record<string, never>;
        Returns: { fecha: string; consignaciones: number; compensaciones: number }[];
      };
      corr_deudas_saldos: {
        Args: Record<string, never>;
        Returns: { persona: string; monto: number; abonado: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Atajos de fila tipados.
export type ProfileRow = Database["public"]["Tables"]["corr_profiles"]["Row"];
export type ConsignacionLuisRow = Database["public"]["Tables"]["corr_consignaciones_luis"]["Row"];
export type CompensacionLuisRow = Database["public"]["Tables"]["corr_compensaciones_luis"]["Row"];
export type CuadreRow = Database["public"]["Tables"]["corr_cuadres"]["Row"];
export type DeudaRow = Database["public"]["Tables"]["corr_deudas"]["Row"];
export type AbonoRow = Database["public"]["Tables"]["corr_abonos"]["Row"];
export type SoporteRow = Database["public"]["Tables"]["corr_soportes"]["Row"];
export type GeneralRow = Database["public"]["Tables"]["corr_general"]["Row"];
export type MovPropioRow = Database["public"]["Tables"]["corr_mov_propios"]["Row"];
export type AuditRow = Database["public"]["Tables"]["corr_audit_log"]["Row"];
export type MovimientoRow = Database["public"]["Tables"]["corr_movimientos"]["Row"];
