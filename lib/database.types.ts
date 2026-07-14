// Tipado manual del esquema mientras no hay acceso al proyecto Supabase remoto para
// generarlo automáticamente. Reemplazar por el output real de:
//   supabase gen types typescript --linked > lib/database.types.ts
// una vez corridas las migraciones de supabase/migrations/ (ver CLAUDE.md).
// Mantener sincronizado a mano con supabase/migrations/*.sql hasta entonces.

// El cliente de supabase-js exige que cada tabla declare `Relationships` (aunque no
// definamos FKs para el query builder) — este helper lo agrega automáticamente.
type Tbl<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      fincas: Tbl<{ id: string; nombre: string }, { id: string; nombre: string }>;

      ingenios: Tbl<{ id: string; nombre: string }, { id: string; nombre: string }>;

      profiles: Tbl<
        {
          id: string;
          username: string;
          role: "admin" | "user";
          disabled: boolean;
          created_at: string;
        },
        {
          id: string;
          username: string;
          role?: "admin" | "user";
          disabled?: boolean;
        },
        Partial<{
          username: string;
          role: "admin" | "user";
          disabled: boolean;
        }>
      >;

      lotes: Tbl<
        {
          id: string;
          nombre: string | null;
          ha: number;
          tipo: "Propio" | "Arrendado";
          finca_id: string | null;
          variedad: string | null;
          soca: number | null;
          fecha_plantacion: string | null;
          estado: "Pendiente" | "En cosecha" | "Cosechado";
          arriendo: number | null;
          arriendo_obs: string | null;
          lat: number | null;
          lon: number | null;
          propietario: string | null;
          contrato: string | null;
          obs: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          nombre?: string | null;
          ha: number;
          tipo: "Propio" | "Arrendado";
          finca_id?: string | null;
          variedad?: string | null;
          soca?: number | null;
          fecha_plantacion?: string | null;
          estado?: "Pendiente" | "En cosecha" | "Cosechado";
          arriendo?: number | null;
          arriendo_obs?: string | null;
          lat?: number | null;
          lon?: number | null;
          propietario?: string | null;
          contrato?: string | null;
          obs?: string | null;
        }
      >;

      trabajos: Tbl<
        {
          id: string;
          lote_id: string | null;
          fecha: string;
          tipo: string;
          ha: number | null;
          empresa: string | null;
          obs: string | null;
          costo_labor: number;
          costo_insumos: number;
          costo_total: number;
          created_at: string;
        },
        {
          id?: string;
          lote_id?: string | null;
          fecha: string;
          tipo: string;
          ha?: number | null;
          empresa?: string | null;
          obs?: string | null;
          costo_labor?: number;
          costo_insumos?: number;
        }
      >;

      trabajo_insumos: Tbl<
        {
          id: string;
          trabajo_id: string;
          descripcion: string | null;
          cantidad: number | null;
          unidad: string | null;
          precio_unit: number | null;
          total: number | null;
          factura_id: string | null;
        },
        {
          id?: string;
          trabajo_id: string;
          descripcion?: string | null;
          cantidad?: number | null;
          unidad?: string | null;
          precio_unit?: number | null;
          factura_id?: string | null;
        }
      >;

      facturas: Tbl<
        {
          id: string;
          numero: string | null;
          tipo: string | null;
          proveedor: string | null;
          cuit: string | null;
          fecha: string;
          categoria: string | null;
          obs: string | null;
          total: number;
          total_moneda: string;
          img_path: string | null;
          created_at: string;
        },
        {
          id: string;
          numero?: string | null;
          tipo?: string | null;
          proveedor?: string | null;
          cuit?: string | null;
          fecha: string;
          categoria?: string | null;
          obs?: string | null;
          total: number;
          total_moneda?: string;
          img_path?: string | null;
        }
      >;

      factura_items: Tbl<
        {
          id: string;
          factura_id: string;
          descripcion: string | null;
          cantidad: number | null;
          unidad: string | null;
          precio_unit: number | null;
          total: number | null;
        },
        {
          id?: string;
          factura_id: string;
          descripcion?: string | null;
          cantidad?: number | null;
          unidad?: string | null;
          precio_unit?: number | null;
        }
      >;

      productos: Tbl<
        { id: string; nombre: string; categoria: string | null; unidad: string },
        { id: string; nombre: string; categoria?: string | null; unidad: string }
      >;

      movimientos_stock: Tbl<
        {
          id: string;
          producto_id: string;
          tipo: "entrada" | "salida";
          fecha: string;
          cantidad: number;
          precio_unit: number;
          total: number | null;
          origen: string | null;
          obs: string | null;
          receta_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          producto_id: string;
          tipo: "entrada" | "salida";
          fecha: string;
          cantidad: number;
          precio_unit?: number;
          origen?: string | null;
          obs?: string | null;
          receta_id?: string | null;
        }
      >;

      recetas: Tbl<
        {
          id: string;
          nombre: string | null;
          fecha: string;
          tipo: string | null;
          ha: number | null;
          empresa: string | null;
          obs: string | null;
          costo_total: number;
          costo_ha: number;
          created_at: string;
        },
        {
          id: string;
          nombre?: string | null;
          fecha: string;
          tipo?: string | null;
          ha?: number | null;
          empresa?: string | null;
          obs?: string | null;
          costo_total?: number;
          costo_ha?: number;
        }
      >;

      receta_lotes: Tbl<
        { receta_id: string; lote_id: string },
        { receta_id: string; lote_id: string }
      >;

      receta_items: Tbl<
        {
          id: string;
          receta_id: string;
          producto_id: string | null;
          dosis: number | null;
          unidad: string | null;
          cantidad: number | null;
          precio_unit: number | null;
          total: number | null;
        },
        {
          id?: string;
          receta_id: string;
          producto_id?: string | null;
          dosis?: number | null;
          unidad?: string | null;
          cantidad?: number | null;
          precio_unit?: number | null;
        }
      >;

      infraruts_imports: Tbl<
        {
          id: string;
          filename: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
          row_count: number | null;
          status: "committed" | "legacy_seed" | "reverted";
          ingenio_id: string;
        },
        {
          id?: string;
          filename?: string | null;
          uploaded_by?: string | null;
          row_count?: number | null;
          status?: "committed" | "legacy_seed" | "reverted";
          ingenio_id?: string;
        }
      >;

      infraruts: Tbl<
        {
          id: string;
          cp: number;
          remito: number | null;
          fecha: string;
          finca_raw: string;
          finca_id: string | null;
          veh: number | null;
          maq: number | null;
          kg_neto: number | null;
          kg_trash: number | null;
          kg_azucar: number | null;
          brix: number | null;
          pol: number | null;
          pureza: number | null;
          rdto: number | null;
          import_batch_id: string | null;
          ingenio_id: string;
          created_at: string;
        },
        {
          id?: string;
          cp: number;
          ingenio_id?: string;
          remito?: number | null;
          fecha: string;
          finca_raw: string;
          finca_id?: string | null;
          veh?: number | null;
          maq?: number | null;
          kg_neto?: number | null;
          kg_trash?: number | null;
          kg_azucar?: number | null;
          brix?: number | null;
          pol?: number | null;
          pureza?: number | null;
          rdto?: number | null;
          import_batch_id?: string | null;
        }
      >;

      cps_campo: Tbl<
        {
          cp: number;
          ingenio_id: string;
          fecha: string | null;
          camion: string | null;
          obs: string | null;
          finca_id: string | null;
          created_by: string | null;
          source: "manual" | "excel_import" | "legacy_seed";
          created_at: string;
        },
        {
          cp: number;
          ingenio_id?: string;
          fecha?: string | null;
          camion?: string | null;
          obs?: string | null;
          finca_id?: string | null;
          created_by?: string | null;
          source?: "manual" | "excel_import" | "legacy_seed";
        }
      >;

      bajas_arca: Tbl<
        {
          cp: number;
          fecha: string | null;
          motivo: string | null;
          obs: string | null;
          gestionado: boolean;
          created_at: string;
        },
        {
          cp: number;
          fecha?: string | null;
          motivo?: string | null;
          obs?: string | null;
          gestionado?: boolean;
        }
      >;

      app_settings: Tbl<
        {
          id: number;
          precio_bolsa: number;
          tc_oficial: number;
          tc_blue: number;
          tc_ccl: number;
          updated_at: string;
        },
        Partial<{
          precio_bolsa: number;
          tc_oficial: number;
          tc_blue: number;
          tc_ccl: number;
          updated_at: string;
        }>
      >;

      // Tabla KV del HTML legacy — se mantiene archivada (no se borra) hasta migrar todo
      // vía scripts/migrate-jw-storage.ts. Ningún código de la app nueva escribe acá.
      jw_storage: Tbl<
        { key: string; value: unknown; updated_at: string },
        { key: string; value: unknown; updated_at?: string }
      >;
    };
    Views: {
      stock_saldo: {
        Row: {
          producto_id: string;
          saldo: number;
          precio_prom: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      // supabase/migrations/20260704000000_receta_rpc.sql — guarda receta + items +
      // movimientos de salida de stock como una única transacción atómica.
      create_receta: {
        Args: {
          p_id: string;
          p_nombre: string;
          p_fecha: string;
          p_tipo: string;
          p_ha: number;
          p_empresa: string | null;
          p_obs: string | null;
          p_lote_ids: string[];
          p_items: unknown;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
