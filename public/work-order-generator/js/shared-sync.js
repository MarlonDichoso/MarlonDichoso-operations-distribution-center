(function (global) {
    "use strict";

    const TABLE = "field_documents";
    let client = null;
    let channel = null;
    let applyingRemote = false;

    function configured() {
        const config = global.APP_RUNTIME_CONFIG || {};
        return Boolean(
            global.supabase &&
            config.supabaseUrl &&
            config.supabaseAnonKey &&
            !config.supabaseUrl.includes("YOUR-PROJECT") &&
            !config.supabaseAnonKey.includes("YOUR-PUBLISHABLE")
        );
    }

    async function connect() {
        if (!configured()) return false;
        if (!client) {
            const config = global.APP_RUNTIME_CONFIG;
            client = global.supabase.createClient(
                config.supabaseUrl,
                config.supabaseAnonKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );
        }

        const { data } = await client.auth.getSession();
        return Boolean(data.session);
    }

    function publicRecord(storeName, record) {
        const data = { ...record };
        delete data.id;
        return {
            sync_id: record.syncId,
            document_type: storeName,
            work_order_number: record.workOrderNumber || null,
            property_address: record.address || null,
            vendor_display_name: record.vendor || null,
            document_data: data,
            is_deleted: false
        };
    }

    async function push(storeName, record) {
        if (applyingRemote || !record || !record.syncId) return;
        if (!(await connect())) return;

        const { error } = await client
            .from(TABLE)
            .upsert(publicRecord(storeName, record), { onConflict: "sync_id" });

        if (error) {
            console.warn("Shared document sync is waiting to retry.", error);
        }
    }

    async function remove(storeName, record) {
        if (applyingRemote || !record || !record.syncId) return;
        if (!(await connect())) return;

        const { error } = await client
            .from(TABLE)
            .update({ is_deleted: true })
            .eq("sync_id", record.syncId);

        if (error) {
            console.warn("Shared document deletion is waiting to retry.", error);
        }
    }

    async function findLocalBySyncId(storeName, syncId) {
        const records = await getAllRecords(storeName);
        return records.find((item) => item.syncId === syncId) || null;
    }

    async function applyRow(row) {
        if (!row || !["workOrders", "verifications", "settings"].includes(row.document_type)) {
            return;
        }

        applyingRemote = true;
        try {
            const local = await findLocalBySyncId(row.document_type, row.sync_id);
            if (row.is_deleted) {
                if (local) await deleteRecord(row.document_type, local.id);
                return;
            }

            const incoming = {
                ...(row.document_data || {}),
                syncId: row.sync_id,
                sharedUpdatedAt: row.updated_at
            };

            if (local) {
                await updateRecord(row.document_type, { ...incoming, id: local.id });
            } else {
                await saveRecord(row.document_type, incoming);
            }
        } finally {
            applyingRemote = false;
        }
    }

    async function pull() {
        if (!(await connect())) return false;
        const { data, error } = await client
            .from(TABLE)
            .select("*")
            .order("updated_at", { ascending: true });

        if (error) {
            console.warn("Unable to load shared field documents.", error);
            return false;
        }

        for (const row of data || []) await applyRow(row);
        return true;
    }

    async function pushLocalCache() {
        for (const storeName of ["workOrders", "verifications", "settings"]) {
            const records = await getAllRecords(storeName);
            for (const record of records) {
                if (!record.syncId) {
                    record.syncId = crypto.randomUUID();
                    await updateRecord(storeName, record);
                } else {
                    await push(storeName, record);
                }
            }
        }
    }

    async function startRealtime() {
        if (!(await connect()) || channel) return;
        channel = client
            .channel("field-operations-documents")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: TABLE },
                (change) => applyRow(change.new || change.old)
            )
            .subscribe();
    }

    async function start() {
        if (!(await connect())) {
            console.info("Field documents are using the offline cache until shared access is configured.");
            return false;
        }
        await pull();
        await pushLocalCache();
        await startRealtime();
        return true;
    }

    global.FieldDocumentSync = {
        start,
        pull,
        push,
        remove,
        isApplyingRemote: () => applyingRemote
    };
})(window);
