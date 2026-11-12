'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export type TerritoryOption = {
  departamento: string;
  municipio: string;
};

type TerritoryGroup = {
  departamento: string;
  municipios: TerritoryOption[];
};

type TerritoryFilterProps = {
  territories: TerritoryOption[];
  selectedKeys: string[] | null;
  onSelectionChange: (selectedKeys: string[] | null) => void;
};

export const territoryKey = (territory: TerritoryOption) => `${territory.departamento}::${territory.municipio}`;

const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export default function TerritoryFilter({ territories, selectedKeys, onSelectionChange }: TerritoryFilterProps) {
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const grouped = new Map<string, TerritoryOption[]>();
    for (const territory of territories) {
      const current = grouped.get(territory.departamento) || [];
      current.push(territory);
      grouped.set(territory.departamento, current);
    }
    return Array.from(grouped, ([departamento, municipios]) => ({
      departamento,
      municipios: municipios.sort((a, b) => a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })),
    })).sort((a, b) => a.departamento.localeCompare(b.departamento, 'es', { sensitivity: 'base' }));
  }, [territories]);

  const filteredGroups = useMemo(() => {
    const query = normalizeText(search);
    return groups.map((group) => {
      if (!query || normalizeText(group.departamento).includes(query)) return group;
      return {
        ...group,
        municipios: group.municipios.filter((territory) => normalizeText(territory.municipio).includes(query)),
      };
    }).filter((group) => group.municipios.length > 0);
  }, [groups, search]);

  const toggleMunicipality = (territory: TerritoryOption, checked: boolean) => {
    const current = new Set(selectedKeys ?? territories.map(territoryKey));
    if (checked) current.add(territoryKey(territory));
    else current.delete(territoryKey(territory));
    onSelectionChange(current.size === territories.length ? null : Array.from(current));
  };

  const toggleDepartment = (group: TerritoryGroup) => {
    const current = new Set(selectedKeys ?? territories.map(territoryKey));
    const keys = group.municipios.map(territoryKey);
    const allSelected = keys.every((key) => current.has(key));
    for (const key of keys) {
      if (allSelected) current.delete(key);
      else current.add(key);
    }
    onSelectionChange(current.size === territories.length ? null : Array.from(current));
  };

  const selectedCount = selectedKeys === null ? territories.length : selectedKeys.length;
  const allSelected = selectedCount === territories.length;

  return (
    <aside className="card population-filter-panel" style={{ margin: 0, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14203b' }}>Departamentos / Municipios</span>
        <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
          {selectedCount}/{territories.length}
        </span>
      </div>

      <div className="population-search">
        <Search className="text-slate-400" />
        <input
          type="search"
          placeholder="Buscar depto. o municipio..."
          aria-label="Buscar departamento o municipio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onSelectionChange(event.target.checked ? null : [])}
          />
          <span>Seleccionar todo</span>
        </label>
      </div>

      <div className="population-filter-list">
        {filteredGroups.map((group) => {
          const keys = group.municipios.map(territoryKey);
          const count = keys.filter((key) => selectedKeys === null || selectedKeys.includes(key)).length;
          const checked = count === keys.length;
          return (
            <div key={group.departamento}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#14203b', cursor: 'pointer', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  ref={(element) => { if (element) element.indeterminate = count > 0 && !checked; }}
                  onChange={() => toggleDepartment(groups.find((item) => item.departamento === group.departamento) || group)}
                />
                <span>{group.departamento}</span>
              </label>
              <div style={{ margin: '5px 0 8px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.municipios.map((territory) => {
                  const key = territoryKey(territory);
                  return (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedKeys === null || selectedKeys.includes(key)}
                        onChange={(event) => toggleMunicipality(territory, event.target.checked)}
                      />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{territory.municipio}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}