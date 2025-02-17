/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useContext } from 'react';
import { V1Pod } from '@kubernetes/client-node';
import { PodDrawer } from './PodDrawer';
import {
  containersReady,
  containerStatuses,
  podStatusToCpuUtil,
  podStatusToMemoryUtil,
  totalRestarts,
} from '../../utils/pod';
import { Table, TableColumn } from '@backstage/core-components';
import { PodNamesWithMetricsContext } from '../../hooks/PodNamesWithMetrics';
import { ClusterContext } from '../../hooks/Cluster';

export const READY_COLUMNS: PodColumns = 'READY';
export const RESOURCE_COLUMNS: PodColumns = 'RESOURCE';
export type PodColumns = 'READY' | 'RESOURCE';

type PodsTablesProps = {
  pods: V1Pod[];
  extraColumns?: PodColumns[];
  children?: React.ReactNode;
};

const READY: TableColumn<V1Pod>[] = [
  {
    title: 'containers ready',
    align: 'center',
    render: containersReady,
    width: 'auto',
  },
  {
    title: 'total restarts',
    align: 'center',
    render: totalRestarts,
    type: 'numeric',
    width: 'auto',
  },
];

export const PodsTable = ({ pods, extraColumns = [] }: PodsTablesProps) => {
  const podNamesWithMetrics = useContext(PodNamesWithMetricsContext);
  const cluster = useContext(ClusterContext);
  const defaultColumns: TableColumn<V1Pod>[] = [
    {
      title: 'name',
      highlight: true,
      render: (pod: V1Pod) => (
        <PodDrawer
          podAndErrors={{
            pod: pod as any,
            clusterName: cluster.name,
            errors: [],
          }}
        />
      ),
    },
    {
      title: 'phase',
      render: (pod: V1Pod) => pod.status?.phase ?? 'unknown',
      width: 'auto',
    },
    {
      title: 'status',
      render: containerStatuses,
    },
  ];
  const columns: TableColumn<V1Pod>[] = [...defaultColumns];

  if (extraColumns.includes(READY_COLUMNS)) {
    columns.push(...READY);
  }
  if (extraColumns.includes(RESOURCE_COLUMNS)) {
    const resourceColumns: TableColumn<V1Pod>[] = [
      {
        title: 'CPU usage %',
        render: (pod: V1Pod) => {
          const metrics = podNamesWithMetrics.get(pod.metadata?.name ?? '');

          if (!metrics) {
            return 'unknown';
          }

          return podStatusToCpuUtil(metrics);
        },
        width: 'auto',
      },
      {
        title: 'Memory usage %',
        render: (pod: V1Pod) => {
          const metrics = podNamesWithMetrics.get(pod.metadata?.name ?? '');

          if (!metrics) {
            return 'unknown';
          }

          return podStatusToMemoryUtil(metrics);
        },
        width: 'auto',
      },
    ];
    columns.push(...resourceColumns);
  }

  const tableStyle = {
    minWidth: '0',
    width: '100%',
  };

  const usePods = pods.map(p => ({ ...p, id: p.metadata?.uid }));

  return (
    <div style={tableStyle}>
      <Table
        options={{ paging: true, search: false, emptyRowsWhenPaging: false }}
        data={usePods}
        columns={columns}
      />
    </div>
  );
};
