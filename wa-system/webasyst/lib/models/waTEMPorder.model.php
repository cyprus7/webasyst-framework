<?php

class waTEMPorderModel extends waModel
{
    protected $table = 'temp_order';
    protected $id = 'id';

    public function get($id)
    {
        $sql = 'SELECT order_data FROM '. $this->table.' WHERE id = i:0';
        return $this->query($sql, array($id))->fetchAll('order_data', true);
    }

    public function set($id, $value)
    {
        return $this->replace(array('id' => $id, 'order_data' => $value));
    }

    public function del($id)
    {
        return $this->deleteById($id);
    }
}